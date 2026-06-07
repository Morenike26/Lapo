// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Owner-updatable price oracle.
// Prices are stored as USDC (6 decimals) per 1e18 base units of the token.
// e.g. mwETH at $2500 → price = 2_500_000_000
contract PriceOracle {
    address public owner;
    mapping(address => uint256) public prices;

    event PriceSet(address indexed token, uint256 price);

    error NotOwner();
    error ZeroPrice();

    constructor() {
        owner = msg.sender;
    }

    function setPrice(address token, uint256 priceUSDC) external {
        if (msg.sender != owner) revert NotOwner();
        if (priceUSDC == 0) revert ZeroPrice();
        prices[token] = priceUSDC;
        emit PriceSet(token, priceUSDC);
    }

    function setBatchPrices(address[] calldata tokens, uint256[] calldata priceList) external {
        if (msg.sender != owner) revert NotOwner();
        for (uint256 i = 0; i < tokens.length; i++) {
            prices[tokens[i]] = priceList[i];
            emit PriceSet(tokens[i], priceList[i]);
        }
    }

    function getPrice(address token) external view returns (uint256) {
        return prices[token];
    }
}
