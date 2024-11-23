// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenDistributor is Ownable {
    struct Pool {
        address tokenAddress;
        uint256 totalAmount;
        string description;
        uint256 startClaimTime;
        uint256 endClaimTime;
        uint256 createTime;
        mapping(address => uint256) userAmounts;
        mapping(address => bool) hasClaimed;
        address[] participants;
        bool isActive;
    }

    mapping(uint256 => Pool) public pools;
    uint256 public poolCounter;

    event PoolCreated(uint256 indexed poolId, address tokenAddress, uint256 amount, string description);
    event AddressAdded(uint256 indexed poolId, address user, uint256 amount);
    event TokenClaimed(uint256 indexed poolId, address user, uint256 amount);
    event TokenReclaimed(uint256 indexed poolId, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function create_pool(
        address _tokenAddress,
        uint256 _totalAmount,
        string memory _description,
        uint256 _startClaimTime,
        uint256 _endClaimTime
    ) external onlyOwner returns (uint256) {
        require(_startClaimTime > block.timestamp, "Start time must be in future");
        require(_endClaimTime > _startClaimTime, "End time must be after start time");
        
        IERC20 token = IERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _totalAmount), "Transfer failed");

        uint256 poolId = poolCounter++;
        Pool storage pool = pools[poolId];
        pool.tokenAddress = _tokenAddress;
        pool.totalAmount = _totalAmount;
        pool.description = _description;
        pool.startClaimTime = _startClaimTime;
        pool.endClaimTime = _endClaimTime;
        pool.createTime = block.timestamp;
        pool.isActive = true;

        emit PoolCreated(poolId, _tokenAddress, _totalAmount, _description);
        return poolId;
    }

    function create_pool_no_token(
        string memory _description,
        uint256 _startClaimTime,
        uint256 _endClaimTime
    ) external onlyOwner returns (uint256) {
        require(_startClaimTime > block.timestamp, "Start time must be in future");
        require(_endClaimTime > _startClaimTime, "End time must be after start time");

        uint256 poolId = poolCounter++;
        Pool storage pool = pools[poolId];
        pool.description = _description;
        pool.startClaimTime = _startClaimTime;
        pool.endClaimTime = _endClaimTime;
        pool.createTime = block.timestamp;
        pool.isActive = true;

        emit PoolCreated(poolId, address(0), 0, _description);
        return poolId;
    }

    function add_token_to_pool(uint256 _poolId, address _tokenAddress, uint256 _amount) external onlyOwner {
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool does not exist");
        require(pool.tokenAddress == address(0), "Pool already has token");
        
        IERC20 token = IERC20(_tokenAddress);
        require(token.transferFrom(msg.sender, address(this), _amount), "Transfer failed");

        pool.tokenAddress = _tokenAddress;
        pool.totalAmount = _amount;
    }

    function add_address_amount_to_pool(
        uint256 _poolId,
        address[] calldata _addresses,
        uint256[] calldata _amounts
    ) external onlyOwner {
        require(_addresses.length == _amounts.length, "Arrays length mismatch");
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool does not exist");

        for (uint256 i = 0; i < _addresses.length; i++) {
            if (pool.userAmounts[_addresses[i]] == 0) {
                pool.participants.push(_addresses[i]);
            }
            pool.userAmounts[_addresses[i]] = _amounts[i];
            emit AddressAdded(_poolId, _addresses[i], _amounts[i]);
        }
    }

    function claim_token_by_pool(uint256 _poolId) external {
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool does not exist");
        require(block.timestamp >= pool.startClaimTime, "Claim not started");
        require(block.timestamp <= pool.endClaimTime, "Claim ended");
        require(!pool.hasClaimed[msg.sender], "Already claimed");
        require(pool.userAmounts[msg.sender] > 0, "No tokens to claim");

        uint256 amount = pool.userAmounts[msg.sender];
        pool.hasClaimed[msg.sender] = true;

        IERC20(pool.tokenAddress).transfer(msg.sender, amount);
        emit TokenClaimed(_poolId, msg.sender, amount);
    }

    function reclaim_pool_token(uint256 _poolId) external onlyOwner {
        Pool storage pool = pools[_poolId];
        require(pool.isActive, "Pool does not exist");
        require(block.timestamp > pool.endClaimTime, "Claim period not ended");

        uint256 balance = IERC20(pool.tokenAddress).balanceOf(address(this));
        require(IERC20(pool.tokenAddress).transfer(owner(), balance), "Transfer failed");
        
        pool.isActive = false;
        emit TokenReclaimed(_poolId, balance);
    }

    // Getter functions
    function get_token_in_pool(uint256 _poolId) external view returns (address, uint256) {
        Pool storage pool = pools[_poolId];
        return (pool.tokenAddress, pool.totalAmount);
    }

    function get_token_claimable_by_pool(uint256 _poolId, address _user) external view returns (uint256) {
        Pool storage pool = pools[_poolId];
        if (pool.hasClaimed[_user] || !pool.isActive) {
            return 0;
        }
        return pool.userAmounts[_user];
    }

    function get_token_address(uint256 _poolId) external view returns (address) {
        return pools[_poolId].tokenAddress;
    }

    function get_all_addresses_in_pool(uint256 _poolId) external view returns (address[] memory) {
        return pools[_poolId].participants;
    }
}