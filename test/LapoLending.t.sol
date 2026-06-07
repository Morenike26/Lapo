// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LapoLending.sol";
import "../src/MockERC20.sol";
import "../src/PriceOracle.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external { balanceOf[to] += amount; }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount; return true;
    }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "bal"); require(allowance[from][msg.sender] >= amount, "allow");
        balanceOf[from] -= amount; balanceOf[to] += amount; allowance[from][msg.sender] -= amount; return true;
    }
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "bal"); balanceOf[msg.sender] -= amount; balanceOf[to] += amount; return true;
    }
}

contract LapoLendingTest is Test {
    LapoLending lending;
    MockUSDC    usdc;
    MockERC20   mwETH;
    PriceOracle oracle;

    address owner    = address(1);
    address treasury = address(2);
    address lender   = address(3);
    address borrower = address(4);
    address liquidator = address(5);

    uint256 constant ETH_PRICE = 2_600_000_000; // $2600 per token (6 dec)
    uint256 constant ONE_ETH   = 1e18;
    uint256 constant ONE_USDC  = 1e6;

    function setUp() public {
        usdc   = new MockUSDC();
        mwETH  = new MockERC20("Mocked Wrapped Ether", "mwETH");
        oracle = new PriceOracle();
        oracle.setPrice(address(mwETH), ETH_PRICE);

        vm.prank(owner);
        lending = new LapoLending(address(usdc), address(oracle), treasury);
        vm.prank(owner);
        lending.setSupportedCollateral(address(mwETH), true);

        // Fund pool
        usdc.mint(lender,    100_000 * ONE_USDC);
        vm.prank(lender); usdc.approve(address(lending), type(uint256).max);

        // Fund borrower with collateral
        mwETH.mint(borrower, 10 * ONE_ETH);
        usdc.mint(borrower, 1_000 * ONE_USDC); // for repayment
        vm.prank(borrower);
        mwETH.approve(address(lending), type(uint256).max);
        vm.prank(borrower);
        usdc.approve(address(lending), type(uint256).max);

        // Fund liquidator
        usdc.mint(liquidator, 100_000 * ONE_USDC);
        vm.prank(liquidator);
        usdc.approve(address(lending), type(uint256).max);
    }

    function testDeposit() public {
        vm.prank(lender);
        uint256 issued = lending.deposit(1_000 * ONE_USDC);
        assertEq(issued, 1_000 * ONE_USDC);
        assertEq(lending.shares(lender), issued);
    }

    function testWithdraw() public {
        vm.prank(lender); lending.deposit(1_000 * ONE_USDC);
        vm.prank(lender); uint256 got = lending.withdraw(500 * ONE_USDC);
        assertEq(got, 500 * ONE_USDC);
    }

    function testOpenPosition() public {
        vm.prank(lender); lending.deposit(10_000 * ONE_USDC);

        // 1 ETH = $2600. At 135% ratio, max borrow = 2600 * 100 / 135 ≈ $1925
        uint256 borrow = 1_000 * ONE_USDC;
        vm.prank(borrower);
        uint256 pid = lending.openPosition(address(mwETH), ONE_ETH, borrow);

        LapoLending.Position memory pos = lending.getPosition(pid);
        assertEq(pos.borrower, borrower);
        assertEq(pos.borrowedUSDC, borrow);
        assertFalse(pos.closed);
    }

    function testOpenPositionInsufficientCollateral() public {
        vm.prank(lender); lending.deposit(10_000 * ONE_USDC);
        vm.prank(borrower);
        vm.expectRevert(LapoLending.InsufficientCollateral.selector);
        // Try to borrow more than 74% of collateral value
        lending.openPosition(address(mwETH), ONE_ETH, 2_000 * ONE_USDC);
    }

    function testClosePosition() public {
        vm.prank(lender); lending.deposit(10_000 * ONE_USDC);
        vm.prank(borrower); uint256 pid = lending.openPosition(address(mwETH), ONE_ETH, 1_000 * ONE_USDC);

        vm.warp(block.timestamp + 30 days);
        vm.prank(borrower); lending.closePosition(pid);

        LapoLending.Position memory pos = lending.getPosition(pid);
        assertTrue(pos.closed);
    }

    function testLiquidation() public {
        vm.prank(lender); lending.deposit(10_000 * ONE_USDC);
        vm.prank(borrower); uint256 pid = lending.openPosition(address(mwETH), ONE_ETH, 1_000 * ONE_USDC);

        // Crash ETH price so collateral = $1000 (exactly 100% of debt, below 105% threshold)
        oracle.setPrice(address(mwETH), 1_000_000_000); // $1000

        vm.prank(liquidator);
        lending.liquidate(pid);

        LapoLending.Position memory pos = lending.getPosition(pid);
        assertTrue(pos.liquidated);
    }

    function testHealthyPositionCannotBeLiquidated() public {
        vm.prank(lender); lending.deposit(10_000 * ONE_USDC);
        vm.prank(borrower); uint256 pid = lending.openPosition(address(mwETH), ONE_ETH, 1_000 * ONE_USDC);

        vm.prank(liquidator);
        vm.expectRevert(LapoLending.PositionHealthy.selector);
        lending.liquidate(pid);
    }
}
