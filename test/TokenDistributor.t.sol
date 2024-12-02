// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {Test, console2} from "forge-std/Test.sol";
import {TokenDistributor} from "../src/TokenDistributor.sol";
import {AvailToken} from "../src/AvailToken.sol";

// Move MockFailingToken outside of the test contract
contract MockFailingToken is AvailToken {
    function transfer(address, uint256) public pure override returns (bool) {
        return false;
    }
}

contract TokenDistributorTest is Test {
    TokenDistributor public distributor;
    AvailToken public token;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = vm.addr(1);
        user2 = vm.addr(2);
        
        // Deploy contracts
        token = new AvailToken();
        distributor = new TokenDistributor();

        // Mint tokens to owner
        token.mint(owner, 1000 * 1e18);
    }

    function test_CreateAutoPool() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
        assertEq(poolId, 1);
        
        (,, string memory name,,, TokenDistributor.PoolType poolType) = distributor.getPoolInfo(poolId);
        assertEq(name, "Test Pool");
        assertEq(uint(poolType), uint(TokenDistributor.PoolType.AUTO_TRANSFER));
    }

    function test_AddAddressesToPool() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        
        assertEq(distributor.getClaimableAmount(poolId, user1), 10 * 1e18);
        assertEq(distributor.getClaimableAmount(poolId, user2), 20 * 1e18);
    }

    function test_AddTokenToPool() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
        
        // Add addresses first
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        
        // Approve tokens
        token.approve(address(distributor), 30 * 1e18);
        
        // Add token to pool
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        (address poolToken,,,,,) = distributor.getPoolInfo(poolId);
        assertEq(poolToken, address(token));
    }

    function test_DistributeToAll() public {
        // Create pool and setup
        uint256 poolId = distributor.createAutoPool("Test Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), 30 * 1e18);
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        // Distribute
        distributor.distributeToAll(poolId, 2);
        
        // Check balances
        assertEq(token.balanceOf(user1), 10 * 1e18);
        assertEq(token.balanceOf(user2), 20 * 1e18);
        
        // Check pool is marked as distributed
        (,,,, bool isDistributed,) = distributor.getPoolInfo(poolId);
        assertTrue(isDistributed);
    }

    function test_DistributeToAllInBatches() public {
        // Create pool and setup
        uint256 poolId = distributor.createAutoPool("Test Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), 30 * 1e18);
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        // Distribute in batches of 1
        distributor.distributeToAll(poolId, 1);
        assertEq(token.balanceOf(user1), 10 * 1e18);
        assertEq(token.balanceOf(user2), 0);
        
        distributor.distributeToAll(poolId, 1);
        assertEq(token.balanceOf(user1), 10 * 1e18);
        assertEq(token.balanceOf(user2), 20 * 1e18);
    }

    function test_DebugDistribute() public {
        uint256 poolId = distributor.createAutoPool("Test Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), 30 * 1e18);
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        (bool[] memory checks, uint256[] memory values) = distributor.debugDistribute(poolId, 2);
        
        // Check boolean flags
        assertTrue(checks[0]);  // isAutoTransfer
        assertTrue(checks[1]);  // isTokenAdded
        assertTrue(checks[2]);  // isNotDistributed
        
        // Check numeric values
        assertEq(values[0], 2); // participantsLength
        assertEq(values[1], 0); // startIndex
    }

    function test_DistributeToAllWithLargeBatch() public {
        // Create pool and setup with more addresses
        uint256 poolId = distributor.createAutoPool("Large Pool");
        
        // Create 10 addresses
        address[] memory addresses = new address[](10);
        uint256[] memory amounts = new uint256[](10);
        uint256 totalAmount = 0;
        
        for(uint256 i = 0; i < 10; i++) {
            addresses[i] = vm.addr(i + 1);
            amounts[i] = (i + 1) * 1e18; // Different amounts for each address
            totalAmount += amounts[i];
        }
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), totalAmount);
        distributor.addTokenToPool(poolId, address(token), totalAmount);
        
        // Distribute in different batch sizes
        distributor.distributeToAll(poolId, 4); // First 4
        distributor.distributeToAll(poolId, 4); // Next 4
        distributor.distributeToAll(poolId, 4); // Last 2
        
        // Verify all balances
        for(uint256 i = 0; i < 10; i++) {
            assertEq(token.balanceOf(addresses[i]), (i + 1) * 1e18);
        }
    }

    function test_DistributeToAllWithZeroBatch() public {
        uint256 poolId = distributor.createAutoPool("Zero Batch Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), 30 * 1e18);
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        // Should not revert with batch size 0, but should not process any transfers
        distributor.distributeToAll(poolId, 0);
        assertEq(token.balanceOf(user1), 0);
        assertEq(token.balanceOf(user2), 0);
    }

    function test_DistributeToAllWithExcessiveBatch() public {
        uint256 poolId = distributor.createAutoPool("Excessive Batch Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        token.approve(address(distributor), 30 * 1e18);
        distributor.addTokenToPool(poolId, address(token), 30 * 1e18);
        
        // Should work with batch size larger than number of participants
        distributor.distributeToAll(poolId, 100);
        assertEq(token.balanceOf(user1), 10 * 1e18);
        assertEq(token.balanceOf(user2), 20 * 1e18);
    }

    function test_DistributeToAllWithFailedTransfer() public {
        // Deploy a mock token that can fail transfers
        MockFailingToken failingToken = new MockFailingToken();
        uint256 poolId = distributor.createAutoPool("Failing Transfer Pool");
        
        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 10 * 1e18;
        amounts[1] = 20 * 1e18;
        
        distributor.addAddressesToPool(poolId, addresses, amounts);
        failingToken.mint(address(this), 30 * 1e18);
        failingToken.approve(address(distributor), 30 * 1e18);
        
        // Add failing token to pool
        distributor.addTokenToPool(poolId, address(failingToken), 30 * 1e18);
        
        // Should revert when transfer fails
        vm.expectRevert();
        distributor.distributeToAll(poolId, 2);
    }
} 
