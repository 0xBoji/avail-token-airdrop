// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script} from "forge-std/Script.sol";
import {TokenDistributor} from "../src/TokenDistributor.sol";

contract DeployTokenDistributor is Script {
    function run() external returns (TokenDistributor) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        TokenDistributor distributor = new TokenDistributor();
        
        vm.stopBroadcast();
        
        return distributor;
    }
} 