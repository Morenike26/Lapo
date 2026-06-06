// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/LapoLending.sol";

contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "insufficient balance");
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to]         += amount;
        return true;
    }
}

contract LapoLendingTest is Test {
    LapoLending public lending;
    MockUSDC    public usdc;

    address owner     = address(1);
    address treasury  = address(2);
    address lender    = address(3);
    address borrower  = address(4);

    uint256 constant ONE_USDC = 1e18;

    function setUp() public {
        usdc = new MockUSDC();
        vm.prank(owner);
        lending = new LapoLending(address(usdc), treasury);

        usdc.mint(lender,   100_000 * ONE_USDC);
        usdc.mint(borrower,  10_000 * ONE_USDC);

        vm.prank(lender);
        usdc.approve(address(lending), type(uint256).max);
        vm.prank(borrower);
        usdc.approve(address(lending), type(uint256).max);
    }

    function testDeposit() public {
        vm.prank(lender);
        uint256 minted = lending.deposit(1_000 * ONE_USDC);
        assertEq(minted, 1_000 * ONE_USDC);
        assertEq(lending.shares(lender), minted);
        assertEq(lending.totalShares(), minted);
    }

    function testWithdraw() public {
        vm.prank(lender);
        lending.deposit(1_000 * ONE_USDC);

        vm.prank(lender);
        uint256 got = lending.withdraw(500 * ONE_USDC);
        assertEq(got, 500 * ONE_USDC);
    }

    function testBootstrapReputation() public {
        vm.prank(borrower);
        lending.bootstrapReputation();
        assertEq(lending.reputationScore(borrower), 100);
    }

    function testRequestAndRepayLoan() public {
        vm.prank(lender);
        lending.deposit(50_000 * ONE_USDC);

        vm.prank(borrower);
        lending.bootstrapReputation();

        uint256 loanAmount = 100 * ONE_USDC;
        vm.prank(borrower);
        uint256 loanId = lending.requestLoan(loanAmount, 30 days);

        LapoLending.Loan memory loan = lending.getLoan(loanId);
        assertEq(loan.borrower, borrower);
        assertFalse(loan.repaid);

        // Repay: borrower needs principal + interest
        uint256 total = loan.principal + loan.interestDue;
        usdc.mint(borrower, total); // extra for interest
        vm.prank(borrower);
        lending.repayLoan(loanId);

        loan = lending.getLoan(loanId);
        assertTrue(loan.repaid);
        assertGt(lending.reputationScore(borrower), 100);
    }

    function testScoreTooLow() public {
        vm.prank(lender);
        lending.deposit(50_000 * ONE_USDC);

        vm.prank(borrower);
        vm.expectRevert(LapoLending.ScoreTooLow.selector);
        lending.requestLoan(100 * ONE_USDC, 30 days);
    }

    function testMarkDefault() public {
        vm.prank(lender);
        lending.deposit(50_000 * ONE_USDC);

        vm.prank(borrower);
        lending.bootstrapReputation();

        vm.prank(borrower);
        uint256 loanId = lending.requestLoan(100 * ONE_USDC, 30 days);

        // Warp past due date + grace
        vm.warp(block.timestamp + 34 days);

        lending.markDefault(loanId);

        LapoLending.Loan memory loan = lending.getLoan(loanId);
        assertTrue(loan.defaulted);
        assertEq(lending.reputationScore(borrower), 50); // 100 - 50
    }
}
