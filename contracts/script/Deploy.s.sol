// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/LapoLending.sol";

contract Deploy is Script {
    // Arc Testnet USDC
    address constant USDC = 0x3600000000000000000000000000000000000000;

    function run() public returns (LapoLending lending) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("USDC:", USDC);

        vm.startBroadcast(deployerKey);
        lending = new LapoLending(USDC, deployer);
        vm.stopBroadcast();

        console.log("LapoLending deployed at:", address(lending));
    }
}
