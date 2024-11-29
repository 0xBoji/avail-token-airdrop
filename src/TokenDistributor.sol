// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TokenDistributor is Ownable {
   enum PoolType { AUTO_TRANSFER, CLAIMABLE }

   struct Pool {
       address token;
       uint256 totalAmount; 
       string name;
       bool isTokenAdded;
       bool isDistributed;
       PoolType poolType;
       mapping(address => uint256) distributionAmount;
       mapping(address => bool) hasClaimed;
       address[] participants;
   }

   mapping(uint256 => Pool) public pools;
   uint256 public currentPoolId;
   uint256[] private poolIds;

   event PoolCreated(uint256 indexed poolId, string name, PoolType poolType);
   event AddressesAdded(uint256 indexed poolId, uint256 totalAddresses);
   event TokenAddedToPool(uint256 indexed poolId, address token, uint256 amount);
   event TokensDistributed(uint256 indexed poolId);
   event TokenClaimed(uint256 indexed poolId, address user, uint256 amount);

   constructor() Ownable(msg.sender) {}

   // Type 1: Create auto-transfer pool
   function createAutoPool(string memory name) external onlyOwner returns (uint256) {
       uint256 poolId = ++currentPoolId;
       Pool storage pool = pools[poolId];
       pool.name = name;
       pool.poolType = PoolType.AUTO_TRANSFER;
       
       poolIds.push(poolId);
       emit PoolCreated(poolId, name, PoolType.AUTO_TRANSFER);
       return poolId;
   }

   // Type 2: Create claimable pool 
   function createClaimPool(string memory name) external onlyOwner returns (uint256) {
       uint256 poolId = ++currentPoolId;
       Pool storage pool = pools[poolId];
       pool.name = name;
       pool.poolType = PoolType.CLAIMABLE;
       
       poolIds.push(poolId);
       emit PoolCreated(poolId, name, PoolType.CLAIMABLE);
       return poolId;
   }

   // Step 2: Add addresses and amounts to pool
   function addAddressesToPool(
       uint256 poolId,
       address[] calldata addresses,
       uint256[] calldata amounts
   ) external onlyOwner {
       require(addresses.length == amounts.length, "Arrays length mismatch");
       require(!pools[poolId].isTokenAdded, "Token already added");
       
       Pool storage pool = pools[poolId];
       uint256 totalAmount;

       for (uint256 i = 0; i < addresses.length; i++) {
           require(addresses[i] != address(0), "Invalid address");
           require(amounts[i] > 0, "Amount must be greater than 0");
           require(pool.distributionAmount[addresses[i]] == 0, "Address already added");

           pool.distributionAmount[addresses[i]] = amounts[i];
           pool.participants.push(addresses[i]);
           totalAmount += amounts[i];
       }

       pool.totalAmount = totalAmount;
       emit AddressesAdded(poolId, addresses.length);
   }

   // Step 3: Add token to pool
   function addTokenToPool(
       uint256 poolId, 
       address token,
       uint256 amount
   ) external onlyOwner {
       require(token != address(0), "Invalid token address");
       require(amount > 0, "Amount must be greater than 0");
       
       Pool storage pool = pools[poolId];
       require(!pool.isTokenAdded, "Token already added");
       require(pool.totalAmount > 0, "Add addresses first");
       require(amount >= pool.totalAmount, "Amount must be >= total distribution amount");
   
       pool.token = token;
       pool.isTokenAdded = true;
   
       IERC20(token).transferFrom(msg.sender, address(this), amount);
       emit TokenAddedToPool(poolId, token, amount);
   }

   // Step 4 (Type 1): Batch transfer to all addresses
   function distributeToAll(uint256 poolId) external onlyOwner {
       Pool storage pool = pools[poolId];
       require(pool.poolType == PoolType.AUTO_TRANSFER, "Not an auto-transfer pool");
       require(pool.isTokenAdded, "Token not added yet");
       require(!pool.isDistributed, "Already distributed");

       IERC20 token = IERC20(pool.token);

       // Prepare arrays for batch transfer
       address[] memory recipients = new address[](pool.participants.length);
       uint256[] memory amounts = new uint256[](pool.participants.length);
       
       for(uint256 i = 0; i < pool.participants.length; i++) {
           recipients[i] = pool.participants[i];
           amounts[i] = pool.distributionAmount[recipients[i]];
       }

       // Internal batch transfer - single transaction
       _batchTransfer(token, recipients, amounts);

       pool.isDistributed = true;
       emit TokensDistributed(poolId);
   }

   // Internal batch transfer function
   function _batchTransfer(
       IERC20 token,
       address[] memory recipients,
       uint256[] memory amounts
   ) internal {
       require(recipients.length == amounts.length, "Length mismatch");
       
       for(uint256 i = 0; i < recipients.length; i++) {
           if(amounts[i] > 0) {
               require(token.transfer(recipients[i], amounts[i]), "Transfer failed");
               emit TokenClaimed(currentPoolId, recipients[i], amounts[i]);
           }
       }
   }

   // Step 4 (Type 2): Users claim their tokens 
   function claim(uint256 poolId) external {
       Pool storage pool = pools[poolId];
       require(pool.poolType == PoolType.CLAIMABLE, "Not a claimable pool");
       require(pool.isTokenAdded, "Token not added yet");
       require(!pool.hasClaimed[msg.sender], "Already claimed");
       require(pool.distributionAmount[msg.sender] > 0, "Nothing to claim");

       uint256 amount = pool.distributionAmount[msg.sender];
       pool.hasClaimed[msg.sender] = true;
       
       require(IERC20(pool.token).transfer(msg.sender, amount), "Transfer failed");
       emit TokenClaimed(poolId, msg.sender, amount);
   }

   // View functions
   function getPoolInfo(uint256 poolId) external view returns (
       address token,
       uint256 totalAmount,
       string memory name,
       bool isTokenAdded,
       bool isDistributed,
       PoolType poolType
   ) {
       Pool storage pool = pools[poolId];
       return (
           pool.token,
           pool.totalAmount,
           pool.name,
           pool.isTokenAdded,
           pool.isDistributed,
           pool.poolType
       );
   }

   function getClaimableAmount(uint256 poolId, address user) external view returns (uint256) {
       return pools[poolId].distributionAmount[user];
   }

   function getParticipants(uint256 poolId) external view returns (address[] memory) {
       return pools[poolId].participants;
   }

   function hasUserClaimed(uint256 poolId, address user) external view returns (bool) {
       return pools[poolId].hasClaimed[user];
   }
   
   function getAllPoolIds() external view returns (uint256[] memory) {
       return poolIds;
   }
}
