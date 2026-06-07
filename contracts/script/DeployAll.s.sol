// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MockERC20.sol";
import "../src/PriceOracle.sol";
import "../src/LapoFaucet.sol";
import "../src/LapoLending.sol";

contract DeployAll is Script {
    address constant USDC = 0x3600000000000000000000000000000000000000;

    // Live prices from CoinGecko at deploy time — USDC (6 dec) per 1e18 token units
    uint256 constant ETH_PRICE = 1_609_370_000;    // $1,609.37
    uint256 constant BTC_PRICE = 61_298_000_000;   // $61,298
    uint256 constant SOL_PRICE = 63_860_000;        // $63.86

    function run() public {
        uint256 key      = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(key);

        console.log("Deployer:", deployer);

        vm.startBroadcast(key);

        // 1. Collateral tokens
        MockERC20 mwETH = new MockERC20("Mocked Wrapped Ether",   "mwETH");
        MockERC20 mwBTC = new MockERC20("Mocked Wrapped Bitcoin",  "mwBTC");
        MockERC20 mwSOL = new MockERC20("Mocked Wrapped Solana",   "mwSOL");

        console.log("mwETH:", address(mwETH));
        console.log("mwBTC:", address(mwBTC));
        console.log("mwSOL:", address(mwSOL));

        // 2. Price oracle + initial prices
        PriceOracle oracle = new PriceOracle();
        oracle.setPrice(address(mwETH), ETH_PRICE);
        oracle.setPrice(address(mwBTC), BTC_PRICE);
        oracle.setPrice(address(mwSOL), SOL_PRICE);

        console.log("PriceOracle:", address(oracle));

        // 3. Faucet — authorise it to mint all three tokens
        LapoFaucet faucet = new LapoFaucet(address(mwETH), address(mwBTC), address(mwSOL));
        mwETH.setMinter(address(faucet), true);
        mwBTC.setMinter(address(faucet), true);
        mwSOL.setMinter(address(faucet), true);

        console.log("LapoFaucet:", address(faucet));

        // 4. Lending pool
        LapoLending lending = new LapoLending(USDC, address(oracle), deployer);
        lending.setSupportedCollateral(address(mwETH), true);
        lending.setSupportedCollateral(address(mwBTC), true);
        lending.setSupportedCollateral(address(mwSOL), true);

        console.log("LapoLending:", address(lending));

        vm.stopBroadcast();
    }
}
