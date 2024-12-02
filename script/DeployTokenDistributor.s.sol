// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TokenDistributor.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() external {
        uint256 deployerPrivateKey = 0x9195523e63066d2354255044d987db522e7cd411d33fc48725bf9a110ca65e85;
        vm.startBroadcast(deployerPrivateKey);

        // Deploy TokenDistributor
        TokenDistributor distributor = new TokenDistributor();
        console.log("TokenDistributor deployed to:", address(distributor));

        vm.stopBroadcast();
    }
} 