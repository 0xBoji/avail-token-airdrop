// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TokenDistributor.sol";
import "../src/AvailToken.sol";

contract InteractScript is Script {
    // Contract addresses
    address constant DISTRIBUTOR = 0xdc11F523C329a2ca31247a266526e05354186934;
    address constant TOKEN = 0x421eEeF4f73c23B976a8AA82b5DD74999260adAc;
    
    // Recipient addresses
    address constant RECIPIENT1 = 0xd69D16FE42107C122369b512ca56A7E17e5AA094; // 30%
    address constant RECIPIENT2 = 0x59a8f4eddCC76Ca1349aF08FB144A1FE29832673; // 70%

    function run() external {
        uint256 deployerPrivateKey = 0x9195523e63066d2354255044d987db522e7cd411d33fc48725bf9a110ca65e85;
        vm.startBroadcast(deployerPrivateKey);

        TokenDistributor distributor = TokenDistributor(DISTRIBUTOR);
        IERC20 token = IERC20(TOKEN);

        // Step 1: Create auto-transfer pool
        uint256 poolId = distributor.createAutoPool("Distribution Pool");
        console.log("Created pool with ID:", poolId);

        // Step 2: Add addresses and amounts
        address[] memory addresses = new address[](2);
        addresses[0] = RECIPIENT1;
        addresses[1] = RECIPIENT2;

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 30 * 1e18; // 30 tokens for first recipient
        amounts[1] = 70 * 1e18; // 70 tokens for second recipient

        distributor.addAddressesToPool(poolId, addresses, amounts);
        console.log("Added addresses to pool");

        // Step 3: Approve and add tokens
        token.approve(DISTRIBUTOR, 100 * 1e18);
        distributor.addTokenToPool(poolId, TOKEN, 100 * 1e18);
        console.log("Added tokens to pool");

        // Step 4: Distribute tokens
        distributor.distributeToAll(poolId, 2);
        console.log("Distributed tokens");

        vm.stopBroadcast();
    }
} 