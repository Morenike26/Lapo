// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMintable {
    function mint(address to, uint256 amount) external;
}

// One-time faucet: each address can claim 5 mwETH, 5 mwBTC, and 5 mwSOL.
contract LapoFaucet {
    IMintable public immutable mwETH;
    IMintable public immutable mwBTC;
    IMintable public immutable mwSOL;

    uint256 public constant CLAIM_AMOUNT = 5 ether; // 5 × 1e18

    mapping(address => bool) public hasClaimed;

    event Claimed(address indexed user);

    error AlreadyClaimed();

    constructor(address _mwETH, address _mwBTC, address _mwSOL) {
        mwETH = IMintable(_mwETH);
        mwBTC = IMintable(_mwBTC);
        mwSOL = IMintable(_mwSOL);
    }

    function claim() external {
        if (hasClaimed[msg.sender]) revert AlreadyClaimed();
        hasClaimed[msg.sender] = true;
        mwETH.mint(msg.sender, CLAIM_AMOUNT);
        mwBTC.mint(msg.sender, CLAIM_AMOUNT);
        mwSOL.mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender);
    }
}
