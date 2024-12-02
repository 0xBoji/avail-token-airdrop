// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TokenDistributor.sol";
import "../src/AvailToken.sol";

contract AddTokenToPoolScript is Script {
    function run() external {
        uint256 privateKey = vm.envUint("PRIVATE_KEY");
        address DISTRIBUTOR = 0x7d9541d31a343e2B5A711D260C19D353D73dB0Ed;
        address AVAIL_TOKEN = 0x421eEeF4f73c23B976a8AA82b5DD74999260adAc;
        uint256 poolId = 1;
        uint256 amount = 1000 * 10**18; // 1000 tokens

        vm.startBroadcast(privateKey);

        // Get the token contract
        AvailToken token = AvailToken(AVAIL_TOKEN);
        
        // Approve tokens
        token.approve(DISTRIBUTOR, amount);
        
        // Add token to pool
        TokenDistributor distributor = TokenDistributor(DISTRIBUTOR);
        distributor.addTokenToPool(poolId, AVAIL_TOKEN, amount);

        vm.stopBroadcast();
    }
} 