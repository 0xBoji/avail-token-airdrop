// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {TokenDistributor} from "../src/TokenDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/AvailToken.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 2_000_000 * 10**18);
    }
}

contract TokenDistributorTest is Test {
    TokenDistributor public distributor;
    MockToken public token;
    address public owner;
    address public user1;
    address public user2;
    AvailToken public availToken;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        distributor = new TokenDistributor();
        token = new MockToken();
        availToken = new AvailToken();
    }

    function test_CreateAutoPool() public {
        uint256 poolId = distributor.createAutoPool("Test Auto Pool");
        
        (,, string memory name,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(poolId);
        assertEq(name, "Test Auto Pool");
        assertEq(uint(poolType), uint(TokenDistributor.PoolType.AUTO_TRANSFER));
    }

    function test_CreateClaimPool() public {
        uint256 poolId = distributor.createClaimPool("Test Claim Pool");
        
        (,, string memory name,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(poolId);
        assertEq(name, "Test Claim Pool");
        assertEq(uint(poolType), uint(TokenDistributor.PoolType.CLAIMABLE));
    }

    function test_AddTokenToPoolWithAmount() public {
        // Step 1: Create pool
        uint256 poolId = distributor.createAutoPool("Test Pool");
    
        // Step 2: Add addresses
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;
    
        distributor.addAddressesToPool(poolId, addresses, amounts);
    
        // Step 3: Add token with specific amount
        uint256 tokenAmount = 1200 * 10**18; // More than total distribution amount
        token.approve(address(distributor), tokenAmount);
        distributor.addTokenToPool(poolId, address(token), tokenAmount);
    
        // Verify pool info
        (address poolToken, uint256 totalAmount,,,,) = distributor.getPoolInfo(poolId);
        assertEq(poolToken, address(token));
        assertEq(token.balanceOf(address(distributor)), tokenAmount);
    }

    function testFail_AddTokenToPoolWithInsufficientAmount() public {
        // Step 1: Create pool
        uint256 poolId = distributor.createAutoPool("Test Pool");
    
        // Step 2: Add addresses
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;
    
        distributor.addAddressesToPool(poolId, addresses, amounts);
    
        // Step 3: Try to add token with insufficient amount
        uint256 insufficientAmount = 500 * 10**18; // Less than total distribution amount
        token.approve(address(distributor), insufficientAmount);
        
        // This should fail because amount is less than total distribution amount
        distributor.addTokenToPool(poolId, address(token), insufficientAmount);
    }

    function test_AddAddressesToPool() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");

        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.addAddressesToPool(poolId, addresses, amounts);

        assertEq(distributor.getClaimableAmount(poolId, user1), 400 * 10**18);
        assertEq(distributor.getClaimableAmount(poolId, user2), 600 * 10**18);
    }
    
    function testFail_AddTokenToPoolWithZeroAmount() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
    
        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 100 * 10**18;
    
        distributor.addAddressesToPool(poolId, addresses, amounts);
    
        // This should fail because amount is zero
        distributor.addTokenToPool(poolId, address(token), 0);
    }

    function test_AddTokenToPoolWithExactAmount() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
    
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;
    
        distributor.addAddressesToPool(poolId, addresses, amounts);
    
        // Add token with exact amount needed for distribution
        uint256 exactAmount = 1000 * 10**18;
        token.approve(address(distributor), exactAmount);
        distributor.addTokenToPool(poolId, address(token), exactAmount);
    
        (address poolToken, uint256 totalAmount,,,,) = distributor.getPoolInfo(poolId);
        assertEq(poolToken, address(token));
        assertEq(totalAmount, exactAmount);
    }

    function test_AddTokenToPool() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
        uint256 amount = 1000 * 10**18;

        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.addAddressesToPool(poolId, addresses, amounts);

        token.approve(address(distributor), amount);
        distributor.addTokenToPool(poolId, address(token), amount);

        (address poolToken,,,,,) = distributor.getPoolInfo(poolId);
        assertEq(poolToken, address(token));
    }

    function test_AutoDistribution() public {
        // Step 1: Create auto pool
        uint256 poolId = distributor.createAutoPool("Auto Pool");

        // Step 2: Add addresses
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add token
        uint256 amount = 1000 * 10**18;
        token.approve(address(distributor), amount);
        distributor.addTokenToPool(poolId, address(token), amount);

        // Step 4: Distribute - now with batch size
        distributor.distributeToAll(poolId, users.length);

        assertEq(token.balanceOf(user1), 400 * 10**18);
        assertEq(token.balanceOf(user2), 600 * 10**18);
    }

    function test_ClaimableDistribution() public {
        // Step 1: Create claim pool
        uint256 poolId = distributor.createClaimPool("Claim Pool");

        // Step 2: Add addresses
        address[] memory users = new address[](2);
        users[0] = user1;
        users[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add token
        uint256 amount = 1000 * 10**18;
        token.approve(address(distributor), amount);
        distributor.addTokenToPool(poolId, address(token), amount);

        // Step 4: Users claim
        vm.prank(user1);
        distributor.claim(poolId);
        assertEq(token.balanceOf(user1), 400 * 10**18);

        vm.prank(user2);
        distributor.claim(poolId);
        assertEq(token.balanceOf(user2), 600 * 10**18);
    }

    function test_GetParticipants() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");

        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.addAddressesToPool(poolId, addresses, amounts);

        address[] memory participants = distributor.getParticipants(poolId);
        assertEq(participants.length, 2);
        assertEq(participants[0], user1);
        assertEq(participants[1], user2);
    }

    function test_AvailTokenAutoDistribution() public {
        // Step 1: Create auto-transfer pool
        uint256 poolId = distributor.createAutoPool("AVAIL Auto Pool");

        // Step 2: Add addresses and amounts
        address[] memory users = new address[](3);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100_000 * 10**18;  // 100k AVAIL
        amounts[1] = 200_000 * 10**18;  // 200k AVAIL
        amounts[2] = 300_000 * 10**18;  // 300k AVAIL

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add AVAIL token
        uint256 totalAmount = 600_000 * 10**18; // 600k AVAIL total
        availToken.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(availToken), totalAmount);

        // Step 4: Distribute to all - now with batch size
        distributor.distributeToAll(poolId, users.length);

        // Verify balances
        assertEq(availToken.balanceOf(address(0x1)), 100_000 * 10**18);
        assertEq(availToken.balanceOf(address(0x2)), 200_000 * 10**18);
        assertEq(availToken.balanceOf(address(0x3)), 300_000 * 10**18);
    }

    function test_AvailTokenClaimableDistribution() public {
        // Step 1: Create claimable pool
        uint256 poolId = distributor.createClaimPool("AVAIL Claim Pool");

        // Step 2: Add addresses and amounts
        address[] memory users = new address[](3);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100_000 * 10**18;  // 100k AVAIL
        amounts[1] = 200_000 * 10**18;  // 200k AVAIL
        amounts[2] = 300_000 * 10**18;  // 300k AVAIL

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add AVAIL token
        uint256 totalAmount = 600_000 * 10**18; // 600k AVAIL total
        availToken.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(availToken), totalAmount);

        // Step 4: Users claim their tokens
        vm.prank(address(0x1));
        distributor.claim(poolId);
        assertEq(availToken.balanceOf(address(0x1)), 100_000 * 10**18);

        vm.prank(address(0x2));
        distributor.claim(poolId);
        assertEq(availToken.balanceOf(address(0x2)), 200_000 * 10**18);

        vm.prank(address(0x3));
        distributor.claim(poolId);
        assertEq(availToken.balanceOf(address(0x3)), 300_000 * 10**18);
    }

    function test_AvailTokenDistributionInfo() public {
        // Create both types of pools
        uint256 autoPoolId = distributor.createAutoPool("AVAIL Auto Pool");
        uint256 claimPoolId = distributor.createClaimPool("AVAIL Claim Pool");

        // Verify pool info
        (,, string memory autoName,,, TokenDistributor.PoolType autoType) = distributor.getPoolInfo(autoPoolId);
        (,, string memory claimName,,, TokenDistributor.PoolType claimType) = distributor.getPoolInfo(claimPoolId);

        assertEq(autoName, "AVAIL Auto Pool");
        assertEq(claimName, "AVAIL Claim Pool");
        assertEq(uint(autoType), uint(TokenDistributor.PoolType.AUTO_TRANSFER));
        assertEq(uint(claimType), uint(TokenDistributor.PoolType.CLAIMABLE));

        // Add same addresses to both pools
        address[] memory users = new address[](3);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 100_000 * 10**18;
        amounts[1] = 200_000 * 10**18;
        amounts[2] = 300_000 * 10**18;

        distributor.addAddressesToPool(autoPoolId, users, amounts);
        distributor.addAddressesToPool(claimPoolId, users, amounts);

        // Verify amounts for each user in both pools
        for (uint i = 0; i < users.length; i++) {
            assertEq(distributor.getClaimableAmount(autoPoolId, users[i]), amounts[i]);
            assertEq(distributor.getClaimableAmount(claimPoolId, users[i]), amounts[i]);
        }

        // Verify participants list
        address[] memory autoParticipants = distributor.getParticipants(autoPoolId);
        address[] memory claimParticipants = distributor.getParticipants(claimPoolId);

        for (uint i = 0; i < users.length; i++) {
            assertEq(autoParticipants[i], users[i]);
            assertEq(claimParticipants[i], users[i]);
        }
    }

    function test_GetAllPoolIds() public {
        // Create multiple pools
        uint256 poolId1 = distributor.createAutoPool("Auto Pool 1");
        uint256 poolId2 = distributor.createClaimPool("Claim Pool 1");
        uint256 poolId3 = distributor.createAutoPool("Auto Pool 2");

        // Get all pool IDs
        uint256[] memory allPoolIds = distributor.getAllPoolIds();

        // Verify the length
        assertEq(allPoolIds.length, 3);

        // Verify the IDs are correct and in order
        assertEq(allPoolIds[0], poolId1);
        assertEq(allPoolIds[1], poolId2);
        assertEq(allPoolIds[2], poolId3);

        // Create another pool and verify it's added to the list
        uint256 poolId4 = distributor.createClaimPool("Claim Pool 2");
        allPoolIds = distributor.getAllPoolIds();
        
        assertEq(allPoolIds.length, 4);
        assertEq(allPoolIds[3], poolId4);
    }

    function test_GetAllPoolIdsEmpty() public {
        // Get pool IDs when no pools exist
        uint256[] memory allPoolIds = distributor.getAllPoolIds();
        assertEq(allPoolIds.length, 0);
    }

    function test_GetAllPoolIdsWithInfo() public {
        // Create pools with different types
        uint256 autoPoolId = distributor.createAutoPool("Auto Pool");
        uint256 claimPoolId = distributor.createClaimPool("Claim Pool");

        // Get all pool IDs
        uint256[] memory allPoolIds = distributor.getAllPoolIds();
        assertEq(allPoolIds.length, 2);

        // Verify pool info for each ID
        for (uint i = 0; i < allPoolIds.length; i++) {
            (,, string memory name,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(allPoolIds[i]);
            
            if (allPoolIds[i] == autoPoolId) {
                assertEq(name, "Auto Pool");
                assertEq(uint(poolType), uint(TokenDistributor.PoolType.AUTO_TRANSFER));
            } else if (allPoolIds[i] == claimPoolId) {
                assertEq(name, "Claim Pool");
                assertEq(uint(poolType), uint(TokenDistributor.PoolType.CLAIMABLE));
            }
        }
    }

    function test_GetAllAutoPools() public {
        // Create multiple pools of different types
        uint256 autoPool1 = distributor.createAutoPool("Auto Pool 1");
        distributor.createClaimPool("Claim Pool 1"); // We don't need this ID
        uint256 autoPool2 = distributor.createAutoPool("Auto Pool 2");
        distributor.createClaimPool("Claim Pool 2"); // We don't need this ID
        
        // Get all auto pools
        uint256[] memory autoPools = distributor.getAllAutoPools();
        
        // Verify length
        assertEq(autoPools.length, 2);
        
        // Verify the correct pools are returned
        assertEq(autoPools[0], autoPool1);
        assertEq(autoPools[1], autoPool2);
        
        // Verify pool types
        for (uint256 i = 0; i < autoPools.length; i++) {
            (,,,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(autoPools[i]);
            assertEq(uint256(poolType), uint256(TokenDistributor.PoolType.AUTO_TRANSFER));
        }
    }

    function test_GetAllClaimablePools() public {
        // Create multiple pools of different types
        distributor.createAutoPool("Auto Pool 1"); // We don't need this ID
        uint256 claimPool1 = distributor.createClaimPool("Claim Pool 1");
        distributor.createAutoPool("Auto Pool 2"); // We don't need this ID
        uint256 claimPool2 = distributor.createClaimPool("Claim Pool 2");
        
        // Get all claimable pools
        uint256[] memory claimablePools = distributor.getAllClaimablePools();
        
        // Verify length
        assertEq(claimablePools.length, 2);
        
        // Verify the correct pools are returned
        assertEq(claimablePools[0], claimPool1);
        assertEq(claimablePools[1], claimPool2);
        
        // Verify pool types
        for (uint256 i = 0; i < claimablePools.length; i++) {
            (,,,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(claimablePools[i]);
            assertEq(uint256(poolType), uint256(TokenDistributor.PoolType.CLAIMABLE));
        }
    }

    function test_GetPoolsInfo() public {
        // Create pools and add tokens and participants
        uint256 poolId1 = distributor.createAutoPool("Auto Pool");
        uint256 poolId2 = distributor.createClaimPool("Claim Pool");
        
        // Add addresses to pools
        address[] memory users = new address[](2);
        users[0] = address(0x1);
        users[1] = address(0x2);
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        
        distributor.addAddressesToPool(poolId1, users, amounts);
        distributor.addAddressesToPool(poolId2, users, amounts);
        
        // Add tokens to pools
        token.approve(address(distributor), 600 * 10**18);
        distributor.addTokenToPool(poolId1, address(token), 300 * 10**18);
        distributor.addTokenToPool(poolId2, address(token), 300 * 10**18);
        
        // Create array of pool IDs to query
        uint256[] memory poolIds = new uint256[](2);
        poolIds[0] = poolId1;
        poolIds[1] = poolId2;
        
        // Get pools info
        (
            address[] memory tokens,
            uint256[] memory totalAmounts,
            string[] memory names,
            bool[] memory areTokensAdded,
            bool[] memory areDistributed,
            TokenDistributor.PoolType[] memory poolTypes
        ) = distributor.getPoolsInfo(poolIds);
        
        // Verify first pool info
        assertEq(tokens[0], address(token));
        assertEq(totalAmounts[0], 300 * 10**18);
        assertEq(names[0], "Auto Pool");
        assertTrue(areTokensAdded[0]);
        assertFalse(areDistributed[0]);
        assertEq(uint256(poolTypes[0]), uint256(TokenDistributor.PoolType.AUTO_TRANSFER));
        
        // Verify second pool info
        assertEq(tokens[1], address(token));
        assertEq(totalAmounts[1], 300 * 10**18);
        assertEq(names[1], "Claim Pool");
        assertTrue(areTokensAdded[1]);
        assertFalse(areDistributed[1]);
        assertEq(uint256(poolTypes[1]), uint256(TokenDistributor.PoolType.CLAIMABLE));
    }

    function test_EmptyPoolsQueries() public {
        // Test empty auto pools
        uint256[] memory autoPools = distributor.getAllAutoPools();
        assertEq(autoPools.length, 0);
        
        // Test empty claimable pools
        uint256[] memory claimablePools = distributor.getAllClaimablePools();
        assertEq(claimablePools.length, 0);
        
        // Test empty pools info
        uint256[] memory emptyPoolIds = new uint256[](0);
        (
            address[] memory tokens,
            uint256[] memory totalAmounts,
            string[] memory names,
            bool[] memory areTokensAdded,
            bool[] memory areDistributed,
            TokenDistributor.PoolType[] memory poolTypes
        ) = distributor.getPoolsInfo(emptyPoolIds);
        
        assertEq(tokens.length, 0);
        assertEq(totalAmounts.length, 0);
        assertEq(names.length, 0);
        assertEq(areTokensAdded.length, 0);
        assertEq(areDistributed.length, 0);
        assertEq(poolTypes.length, 0);
    }

    // Add new test for batch distribution
    function test_BatchDistribution() public {
        // Step 1: Create auto pool
        uint256 poolId = distributor.createAutoPool("Batch Auto Pool");

        // Step 2: Add addresses
        address[] memory users = new address[](5);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);
        users[3] = address(0x4);
        users[4] = address(0x5);
        
        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 100 * 10**18;
        amounts[1] = 200 * 10**18;
        amounts[2] = 300 * 10**18;
        amounts[3] = 400 * 10**18;
        amounts[4] = 500 * 10**18;

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add token
        uint256 totalAmount = 1500 * 10**18;
        token.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(token), totalAmount);

        // Step 4: Distribute in batches of 2
        // First batch (0-1)
        distributor.distributeToAll(poolId, 2);
        assertEq(token.balanceOf(address(0x1)), 100 * 10**18);
        assertEq(token.balanceOf(address(0x2)), 200 * 10**18);
        assertEq(token.balanceOf(address(0x3)), 0); // Not distributed yet
        
        // Second batch (2-3)
        distributor.distributeToAll(poolId, 2);
        assertEq(token.balanceOf(address(0x3)), 300 * 10**18);
        assertEq(token.balanceOf(address(0x4)), 400 * 10**18);
        assertEq(token.balanceOf(address(0x5)), 0); // Not distributed yet
        
        // Final batch (4)
        distributor.distributeToAll(poolId, 2);
        assertEq(token.balanceOf(address(0x5)), 500 * 10**18);
        
        // Verify pool is marked as distributed
        (,,,, bool isDistributed,) = distributor.getPoolInfo(poolId);
        assertTrue(isDistributed);

        // Verify distribution is complete
        vm.expectRevert("Already distributed");
        distributor.distributeToAll(poolId, 2);
    }

    function test_SingleTransactionDistribution() public {
        // Step 1: Create auto pool
        uint256 poolId = distributor.createAutoPool("Single Tx Pool");

        // Step 2: Add 5 addresses
        address[] memory users = new address[](5);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);
        users[3] = address(0x4);
        users[4] = address(0x5);
        
        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 100 * 10**18;  // 100 tokens
        amounts[1] = 200 * 10**18;  // 200 tokens
        amounts[2] = 300 * 10**18;  // 300 tokens
        amounts[3] = 400 * 10**18;  // 400 tokens
        amounts[4] = 500 * 10**18;  // 500 tokens

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add tokens
        uint256 totalAmount = 1500 * 10**18; // 1500 tokens total
        token.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(token), totalAmount);

        // Step 4: Distribute to all addresses in a single transaction
        distributor.distributeToAll(poolId, 5); // Set batch size to 5 to handle all in one tx

        // Verify all balances
        assertEq(token.balanceOf(address(0x1)), 100 * 10**18);
        assertEq(token.balanceOf(address(0x2)), 200 * 10**18);
        assertEq(token.balanceOf(address(0x3)), 300 * 10**18);
        assertEq(token.balanceOf(address(0x4)), 400 * 10**18);
        assertEq(token.balanceOf(address(0x5)), 500 * 10**18);

        // Verify pool is marked as distributed
        (,,,, bool isDistributed,) = distributor.getPoolInfo(poolId);
        assertTrue(isDistributed);

        // Verify distribution progress is complete
        vm.expectRevert("Already distributed");
        distributor.distributeToAll(poolId, 5);
    }

    // Test with larger amount of tokens
    function test_SingleTransactionLargeDistribution() public {
        // Step 1: Create auto pool
        uint256 poolId = distributor.createAutoPool("Large Single Tx Pool");

        // Step 2: Add 5 addresses with larger amounts
        address[] memory users = new address[](5);
        users[0] = address(0x1);
        users[1] = address(0x2);
        users[2] = address(0x3);
        users[3] = address(0x4);
        users[4] = address(0x5);
        
        uint256[] memory amounts = new uint256[](5);
        amounts[0] = 100_000 * 10**18;  // 100k tokens
        amounts[1] = 200_000 * 10**18;  // 200k tokens
        amounts[2] = 300_000 * 10**18;  // 300k tokens
        amounts[3] = 400_000 * 10**18;  // 400k tokens
        amounts[4] = 500_000 * 10**18;  // 500k tokens

        distributor.addAddressesToPool(poolId, users, amounts);

        // Step 3: Add tokens
        uint256 totalAmount = 1_500_000 * 10**18; // 1.5M tokens total
        token.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(token), totalAmount);

        // Record gas usage for large distribution
        uint256 gasBefore = gasleft();
        
        // Step 4: Distribute to all addresses in a single transaction
        distributor.distributeToAll(poolId, 5);
        
        uint256 gasUsed = gasBefore - gasleft();
        emit log_named_uint("Gas used for 5 address distribution", gasUsed);

        // Verify all balances
        assertEq(token.balanceOf(address(0x1)), 100_000 * 10**18);
        assertEq(token.balanceOf(address(0x2)), 200_000 * 10**18);
        assertEq(token.balanceOf(address(0x3)), 300_000 * 10**18);
        assertEq(token.balanceOf(address(0x4)), 400_000 * 10**18);
        assertEq(token.balanceOf(address(0x5)), 500_000 * 10**18);

        // Verify pool is marked as distributed
        (,,,, bool isDistributed,) = distributor.getPoolInfo(poolId);
        assertTrue(isDistributed);
    }
} 
