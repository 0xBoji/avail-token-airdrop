// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {TokenDistributor} from "../src/TokenDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Mock ERC20 token for testing
contract MockToken is ERC20 {
    constructor() ERC20("Mock Token", "MTK") {
        _mint(msg.sender, 1000000 * 10**18);
    }
}

contract TokenDistributorTest is Test {
    TokenDistributor public distributor;
    MockToken public token;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        
        distributor = new TokenDistributor();
        token = new MockToken();
    }

    function test_CreatePool() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        (address poolToken, uint256 poolAmount) = distributor.get_token_in_pool(poolId);
        assertEq(poolToken, address(token));
        assertEq(poolAmount, amount);
    }

    function test_CreatePoolNoToken() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        uint256 poolId = distributor.create_pool_no_token(
            "Test Pool No Token",
            startTime,
            endTime
        );

        (address poolToken, uint256 poolAmount) = distributor.get_token_in_pool(poolId);
        assertEq(poolToken, address(0));
        assertEq(poolAmount, 0);
    }

    function test_AddTokenToPool() public {
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        uint256 amount = 1000 * 10**18;
        
        uint256 poolId = distributor.create_pool_no_token(
            "Test Pool",
            startTime,
            endTime
        );

        token.approve(address(distributor), amount);
        distributor.add_token_to_pool(poolId, address(token), amount);

        (address poolToken, uint256 poolAmount) = distributor.get_token_in_pool(poolId);
        assertEq(poolToken, address(token));
        assertEq(poolAmount, amount);
    }

    function test_AddAddressesToPool() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.add_address_amount_to_pool(poolId, addresses, amounts);

        assertEq(distributor.get_token_claimable_by_pool(poolId, user1), 400 * 10**18);
        assertEq(distributor.get_token_claimable_by_pool(poolId, user2), 600 * 10**18);
    }

    function testFail_ClaimBeforeStartTime() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        distributor.add_address_amount_to_pool(poolId, addresses, amounts);
        
        vm.prank(user1);
        distributor.claim_token_by_pool(poolId); // Should fail
    }

    function test_ClaimToken() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        address[] memory addresses = new address[](1);
        addresses[0] = user1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        distributor.add_address_amount_to_pool(poolId, addresses, amounts);
        
        // Warp to claim period
        vm.warp(startTime + 1);
        
        vm.prank(user1);
        distributor.claim_token_by_pool(poolId);
        
        assertEq(token.balanceOf(user1), amount);
        assertEq(distributor.get_token_claimable_by_pool(poolId, user1), 0);
    }

    function test_ReclaimToken() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        // Warp to after end time
        vm.warp(endTime + 1);
        
        uint256 initialBalance = token.balanceOf(owner);
        distributor.reclaim_pool_token(poolId);
        
        assertEq(token.balanceOf(owner), initialBalance + amount);
    }

    function test_GetAllAddressesInPool() public {
        uint256 amount = 1000 * 10**18;
        uint256 startTime = block.timestamp + 1 days;
        uint256 endTime = startTime + 7 days;
        
        token.approve(address(distributor), amount);
        uint256 poolId = distributor.create_pool(
            address(token),
            amount,
            "Test Pool",
            startTime,
            endTime
        );

        address[] memory addresses = new address[](2);
        addresses[0] = user1;
        addresses[1] = user2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 400 * 10**18;
        amounts[1] = 600 * 10**18;

        distributor.add_address_amount_to_pool(poolId, addresses, amounts);

        address[] memory poolAddresses = distributor.get_all_addresses_in_pool(poolId);
        assertEq(poolAddresses.length, 2);
        assertEq(poolAddresses[0], user1);
        assertEq(poolAddresses[1], user2);
    }
} 