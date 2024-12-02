// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/TokenDistributor.sol";
import "../src/AvailToken.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy AVAIL Token
        AvailToken token = new AvailToken();
        console.log("AvailToken deployed to:", address(token));

        // Deploy TokenDistributor
        TokenDistributor distributor = new TokenDistributor();
        console.log("TokenDistributor deployed to:", address(distributor));

        vm.stopBroadcast();
    }
} 