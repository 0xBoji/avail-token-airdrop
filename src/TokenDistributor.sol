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

   // Add this state variable to track distribution progress
   mapping(uint256 => uint256) private distributionProgress;

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
   function distributeToAll(uint256 poolId, uint256 batchSize) external onlyOwner {
       Pool storage pool = pools[poolId];
       require(pool.poolType == PoolType.AUTO_TRANSFER, "Not an auto-transfer pool");
       require(pool.isTokenAdded, "Token not added yet");
       require(!pool.isDistributed, "Already distributed");

       IERC20 token = IERC20(pool.token);
       uint256 participantsLength = pool.participants.length;
       
       // Get the starting index from progress tracking
       uint256 startIndex = distributionProgress[poolId];
       require(startIndex < participantsLength, "Distribution already completed");
       
       // Calculate the end index for this batch
       uint256 endIndex = startIndex + batchSize;
       if (endIndex > participantsLength) {
           endIndex = participantsLength;
       }

       // Prepare arrays for batch transfer
       address[] memory recipients = new address[](endIndex - startIndex);
       uint256[] memory amounts = new uint256[](endIndex - startIndex);
       
       for(uint256 i = startIndex; i < endIndex; i++) {
           recipients[i - startIndex] = pool.participants[i];
           amounts[i - startIndex] = pool.distributionAmount[pool.participants[i]];
       }

       // Perform batch transfer
       _batchTransfer(token, recipients, amounts, poolId);

       // Update progress
       distributionProgress[poolId] = endIndex;

       // Mark as distributed if this is the last batch
       if (endIndex == participantsLength) {
           pool.isDistributed = true;
           emit TokensDistributed(poolId);
       }
   }

   // Internal batch transfer function with improved error handling
   function _batchTransfer(
       IERC20 token,
       address[] memory recipients,
       uint256[] memory amounts,
       uint256 poolId
   ) internal {
       require(recipients.length == amounts.length, "Length mismatch");
       
       for(uint256 i = 0; i < recipients.length; i++) {
           if(amounts[i] > 0) {
               bool success = token.transfer(recipients[i], amounts[i]);
               require(success, string(abi.encodePacked("Transfer failed for recipient: ", addressToString(recipients[i]))));
               emit TokenClaimed(poolId, recipients[i], amounts[i]);
           }
       }
   }

   // Helper function to convert address to string for error messages
   function addressToString(address _addr) internal pure returns(string memory) {
       bytes32 value = bytes32(uint256(uint160(_addr)));
       bytes memory alphabet = "0123456789abcdef";
       bytes memory str = new bytes(42);
       str[0] = "0";
       str[1] = "x";
       for (uint256 i = 0; i < 20; i++) {
           str[2+i*2] = alphabet[uint8(value[i + 12] >> 4)];
           str[3+i*2] = alphabet[uint8(value[i + 12] & 0x0f)];
       }
       return string(str);
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

   // Get all auto-transfer pools
   function getAllAutoPools() external view returns (uint256[] memory) {
       uint256[] memory autoPools = new uint256[](poolIds.length);
       uint256 count = 0;
       
       for (uint256 i = 0; i < poolIds.length; i++) {
           if (pools[poolIds[i]].poolType == PoolType.AUTO_TRANSFER) {
               autoPools[count] = poolIds[i];
               count++;
           }
       }
       
       // Create correctly sized array
       uint256[] memory result = new uint256[](count);
       for (uint256 i = 0; i < count; i++) {
           result[i] = autoPools[i];
       }
       
       return result;
   }
   
   // Get all claimable pools
   function getAllClaimablePools() external view returns (uint256[] memory) {
       uint256[] memory claimablePools = new uint256[](poolIds.length);
       uint256 count = 0;
       
       for (uint256 i = 0; i < poolIds.length; i++) {
           if (pools[poolIds[i]].poolType == PoolType.CLAIMABLE) {
               claimablePools[count] = poolIds[i];
               count++;
           }
       }
       
       // Create correctly sized array
       uint256[] memory result = new uint256[](count);
       for (uint256 i = 0; i < count; i++) {
           result[i] = claimablePools[i];
       }
       
       return result;
   }

   // Get detailed pool information for multiple pools
   function getPoolsInfo(uint256[] calldata _poolIds) external view returns (
       address[] memory tokens,
       uint256[] memory totalAmounts,
       string[] memory names,
       bool[] memory areTokensAdded,
       bool[] memory areDistributed,
       PoolType[] memory poolTypes
   ) {
       tokens = new address[](_poolIds.length);
       totalAmounts = new uint256[](_poolIds.length);
       names = new string[](_poolIds.length);
       areTokensAdded = new bool[](_poolIds.length);
       areDistributed = new bool[](_poolIds.length);
       poolTypes = new PoolType[](_poolIds.length);
       
       for (uint256 i = 0; i < _poolIds.length; i++) {
           Pool storage pool = pools[_poolIds[i]];
           tokens[i] = pool.token;
           totalAmounts[i] = pool.totalAmount;
           names[i] = pool.name;
           areTokensAdded[i] = pool.isTokenAdded;
           areDistributed[i] = pool.isDistributed;
           poolTypes[i] = pool.poolType;
       }
       
       return (tokens, totalAmounts, names, areTokensAdded, areDistributed, poolTypes);
   }

   // Add this function to help debug
   function debugDistribute(uint256 poolId, uint256) external view returns (
       bool[] memory checks,
       uint256[] memory values
   ) {
       Pool storage pool = pools[poolId];
       
       checks = new bool[](3);
       checks[0] = pool.poolType == PoolType.AUTO_TRANSFER;  // isAutoTransfer
       checks[1] = pool.isTokenAdded;                        // isTokenAdded
       checks[2] = !pool.isDistributed;                      // isNotDistributed
       
       values = new uint256[](2);
       values[0] = pool.participants.length;                 // participantsLength
       values[1] = distributionProgress[poolId];             // startIndex
       
       return (checks, values);
   }
}