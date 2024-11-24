// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {TokenDistributor} from "../src/TokenDistributor.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../src/AvailToken.sol";

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
        distributor.addTokenToPool(poolId, address(token));

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
        distributor.addTokenToPool(poolId, address(token));

        // Step 4: Distribute
        distributor.distributeToAll(poolId);

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
        distributor.addTokenToPool(poolId, address(token));

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
        distributor.addTokenToPool(poolId, address(availToken));

        // Step 4: Distribute to all
        distributor.distributeToAll(poolId);

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
        distributor.addTokenToPool(poolId, address(availToken));

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
} 