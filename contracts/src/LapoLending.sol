// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title LapoLending
 * @notice Permissionless lending protocol on Arc Testnet.
 *
 * Lenders deposit USDC and receive LP shares that appreciate as interest accrues.
 * Borrowers (SMEs) build an on-chain reputation score through successful repayments
 * and unlock progressively larger USDC credit lines.
 *
 * Fee structure:
 *   - 0.5% origination fee on every loan → protocol treasury
 *   - 10% of interest on repayment → protocol treasury
 *   - 90% of interest on repayment → lending pool (lender yield)
 *
 * Interest model (utilization-based):
 *   APY (bps) = 500 + utilization * 4500
 *   At  0% util → 5%  APY
 *   At 50% util → 27.5% APY
 *   At 100% util → 50% APY
 *
 * Reputation scoring (out of 1000):
 *   On-time repayment  → +20
 *   Late repayment     → +5
 *   Default            → −50 (floor 0)
 *   Score gates max borrow amount against pool TVL.
 */
contract LapoLending {
    // ─── Constants ──────────────────────────────────────────────────────────

    uint256 public constant MAX_SCORE        = 1000;
    uint256 public constant BASIS_POINTS     = 10_000;
    uint256 public constant ORIGINATION_FEE  = 50;     // 0.5% in bps
    uint256 public constant PROTOCOL_CUT     = 1_000;  // 10% of interest in bps
    uint256 public constant BASE_RATE        = 500;    // 5% in bps
    uint256 public constant RATE_SLOPE       = 4_500;  // slope in bps
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    uint256 public constant MIN_SCORE_TO_BORROW = 100;
    uint256 public constant LOAN_GRACE_PERIOD   = 3 days;

    // Loan duration options
    uint256 public constant DURATION_30D = 30 days;
    uint256 public constant DURATION_60D = 60 days;
    uint256 public constant DURATION_90D = 90 days;

    // ─── State ──────────────────────────────────────────────────────────────

    IERC20 public immutable USDC;
    address public owner;
    address public treasury;

    // Pool accounting
    uint256 public totalShares;
    uint256 public totalDeposited;   // principal deposited by lenders (increases on deposit, decreases on withdrawal)
    uint256 public totalBorrowed;    // outstanding principal
    uint256 public accruedToPool;    // interest earned by pool since last checkpoint

    // Reputation
    mapping(address => uint256) public reputationScore;
    mapping(address => uint256) public completedLoans;
    mapping(address => uint256) public defaultedLoans;

    // Lender shares
    mapping(address => uint256) public shares;

    // Loans
    struct Loan {
        uint256 id;
        address borrower;
        uint256 principal;
        uint256 interestDue;    // pre-computed at origination
        uint256 originationFee;
        uint256 startTime;
        uint256 dueDate;
        uint256 repaidAt;
        bool    repaid;
        bool    defaulted;
    }

    uint256 public nextLoanId;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;

    // ─── Events ─────────────────────────────────────────────────────────────

    event Deposited(address indexed lender, uint256 usdc, uint256 shares);
    event Withdrawn(address indexed lender, uint256 shares, uint256 usdc);
    event LoanCreated(uint256 indexed loanId, address indexed borrower, uint256 principal, uint256 dueDate);
    event LoanRepaid(uint256 indexed loanId, address indexed borrower, uint256 interest, bool onTime);
    event LoanDefaulted(uint256 indexed loanId, address indexed borrower);
    event ScoreUpdated(address indexed borrower, uint256 oldScore, uint256 newScore);
    event TreasuryUpdated(address indexed newTreasury);

    // ─── Errors ─────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAmount();
    error InsufficientLiquidity();
    error ScoreTooLow();
    error ExceedsMaxBorrow();
    error InvalidDuration();
    error LoanNotActive();
    error NotBorrower();
    error AlreadyRepaidOrDefaulted();
    error InsufficientRepayment();
    error LoanNotDefaulted();
    error WithdrawalExceedsLiquidity();
    error ZeroShares();

    // ─── Modifiers ──────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Constructor ────────────────────────────────────────────────────────

    constructor(address _usdc, address _treasury) {
        USDC     = IERC20(_usdc);
        owner    = msg.sender;
        treasury = _treasury;
    }

    // ─── Lender: Deposit ────────────────────────────────────────────────────

    /**
     * @notice Deposit USDC into the lending pool and receive LP shares.
     * @param amount USDC amount (6 decimals).
     */
    function deposit(uint256 amount) external returns (uint256 issued) {
        if (amount == 0) revert ZeroAmount();

        uint256 poolAssets = _totalAssets();

        if (totalShares == 0 || poolAssets == 0) {
            issued = amount;
        } else {
            issued = (amount * totalShares) / poolAssets;
        }

        if (issued == 0) revert ZeroShares();

        totalShares    += issued;
        totalDeposited += amount;
        shares[msg.sender] += issued;

        require(USDC.transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit Deposited(msg.sender, amount, issued);
    }

    /**
     * @notice Withdraw USDC from the pool by burning LP shares.
     * @param shareAmount LP shares to burn.
     */
    function withdraw(uint256 shareAmount) external returns (uint256 usdcOut) {
        if (shareAmount == 0) revert ZeroAmount();
        if (shares[msg.sender] < shareAmount) revert ZeroShares();

        uint256 poolAssets = _totalAssets();
        usdcOut = (shareAmount * poolAssets) / totalShares;

        uint256 available = USDC.balanceOf(address(this));
        if (usdcOut > available) revert WithdrawalExceedsLiquidity();

        shares[msg.sender] -= shareAmount;
        totalShares        -= shareAmount;
        totalDeposited      = totalDeposited > usdcOut ? totalDeposited - usdcOut : 0;

        require(USDC.transfer(msg.sender, usdcOut), "transfer failed");
        emit Withdrawn(msg.sender, shareAmount, usdcOut);
    }

    // ─── Borrower: Request Loan ─────────────────────────────────────────────

    /**
     * @notice Request a USDC loan. Reputation score must be ≥ 100.
     *         0.5% origination fee is deducted from disbursed amount.
     * @param principal  Amount of USDC requested (before origination fee).
     * @param duration   Must be 30, 60, or 90 days (in seconds).
     */
    function requestLoan(uint256 principal, uint256 duration) external returns (uint256 loanId) {
        if (principal == 0) revert ZeroAmount();
        if (duration != DURATION_30D && duration != DURATION_60D && duration != DURATION_90D)
            revert InvalidDuration();

        uint256 score = reputationScore[msg.sender];
        if (score < MIN_SCORE_TO_BORROW) revert ScoreTooLow();

        uint256 maxBorrow = _maxBorrow(msg.sender);
        if (principal > maxBorrow) revert ExceedsMaxBorrow();

        uint256 available = USDC.balanceOf(address(this));
        if (principal > available) revert InsufficientLiquidity();

        // Interest pre-computed at origination using current APY
        uint256 apy     = _currentAPY();
        uint256 interest = (principal * apy * duration) / (BASIS_POINTS * SECONDS_PER_YEAR);

        uint256 fee = (principal * ORIGINATION_FEE) / BASIS_POINTS;
        uint256 disbursed = principal - fee;

        loanId = nextLoanId++;
        loans[loanId] = Loan({
            id:             loanId,
            borrower:       msg.sender,
            principal:      principal,
            interestDue:    interest,
            originationFee: fee,
            startTime:      block.timestamp,
            dueDate:        block.timestamp + duration,
            repaidAt:       0,
            repaid:         false,
            defaulted:      false
        });

        borrowerLoans[msg.sender].push(loanId);
        totalBorrowed += principal;

        // Send origination fee to treasury
        require(USDC.transfer(treasury, fee), "fee transfer failed");
        // Disburse net amount to borrower
        require(USDC.transfer(msg.sender, disbursed), "disburse failed");

        emit LoanCreated(loanId, msg.sender, principal, block.timestamp + duration);
    }

    // ─── Borrower: Repay ────────────────────────────────────────────────────

    /**
     * @notice Repay a loan (principal + interest).
     *         10% of interest → treasury. 90% → pool.
     * @param loanId  The ID of the loan to repay.
     */
    function repayLoan(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert LoanNotActive();
        if (msg.sender != loan.borrower) revert NotBorrower();
        if (loan.repaid || loan.defaulted) revert AlreadyRepaidOrDefaulted();

        bool onTime    = block.timestamp <= loan.dueDate + LOAN_GRACE_PERIOD;
        uint256 total  = loan.principal + loan.interestDue;

        uint256 protocolInterest = (loan.interestDue * PROTOCOL_CUT) / BASIS_POINTS;
        uint256 poolInterest     = loan.interestDue - protocolInterest;

        loan.repaid   = true;
        loan.repaidAt = block.timestamp;
        totalBorrowed -= loan.principal;
        accruedToPool += poolInterest;

        // Update reputation
        uint256 oldScore = reputationScore[msg.sender];
        uint256 newScore;
        if (onTime) {
            newScore = _min(oldScore + 20, MAX_SCORE);
        } else {
            newScore = _min(oldScore + 5, MAX_SCORE);
        }
        reputationScore[msg.sender] = newScore;
        completedLoans[msg.sender]  += 1;

        require(USDC.transferFrom(msg.sender, address(this), total), "repay failed");
        require(USDC.transfer(treasury, protocolInterest), "fee failed");

        emit LoanRepaid(loanId, msg.sender, loan.interestDue, onTime);
        emit ScoreUpdated(msg.sender, oldScore, newScore);
    }

    // ─── Default handling ───────────────────────────────────────────────────

    /**
     * @notice Mark an overdue loan as defaulted (anyone can call after grace period).
     *         Reduces borrower's reputation score.
     */
    function markDefault(uint256 loanId) external {
        Loan storage loan = loans[loanId];
        if (loan.borrower == address(0)) revert LoanNotActive();
        if (loan.repaid || loan.defaulted) revert AlreadyRepaidOrDefaulted();
        if (block.timestamp <= loan.dueDate + LOAN_GRACE_PERIOD) revert LoanNotDefaulted();

        loan.defaulted = true;
        totalBorrowed -= loan.principal;
        defaultedLoans[loan.borrower] += 1;

        uint256 oldScore = reputationScore[loan.borrower];
        uint256 newScore = oldScore >= 50 ? oldScore - 50 : 0;
        reputationScore[loan.borrower] = newScore;

        emit LoanDefaulted(loanId, loan.borrower);
        emit ScoreUpdated(loan.borrower, oldScore, newScore);
    }

    // ─── Reputation bootstrap ────────────────────────────────────────────────

    /**
     * @notice Bootstrap your reputation by staking a small USDC deposit.
     *         Calling this once credits +100 points (enough to take a micro-loan)
     *         and refunds immediately — it is a proof-of-intent, not a lock.
     *         Can only be called once per address; requires score == 0.
     */
    function bootstrapReputation() external {
        if (reputationScore[msg.sender] != 0) revert ScoreTooLow();
        uint256 stake = 10 * 1e6; // 10 USDC (6 decimals)

        require(USDC.transferFrom(msg.sender, address(this), stake), "stake failed");
        require(USDC.transfer(msg.sender, stake), "refund failed");

        reputationScore[msg.sender] = 100;
        emit ScoreUpdated(msg.sender, 0, 100);
    }

    // ─── Admin ──────────────────────────────────────────────────────────────

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
    }

    // ─── Views ──────────────────────────────────────────────────────────────

    function totalAssets() external view returns (uint256) {
        return _totalAssets();
    }

    function currentAPY() external view returns (uint256) {
        return _currentAPY();
    }

    function utilizationRate() external view returns (uint256) {
        return _utilization();
    }

    function maxBorrowAmount(address borrower) external view returns (uint256) {
        return _maxBorrow(borrower);
    }

    function lenderUSDCValue(address lender) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lender] * _totalAssets()) / totalShares;
    }

    function getLoan(uint256 loanId) external view returns (Loan memory) {
        return loans[loanId];
    }

    function getBorrowerLoans(address borrower) external view returns (uint256[] memory) {
        return borrowerLoans[borrower];
    }

    function getBorrowerLoanCount(address borrower) external view returns (uint256) {
        return borrowerLoans[borrower].length;
    }

    function poolStats() external view returns (
        uint256 assets,
        uint256 borrowed,
        uint256 liquidity,
        uint256 utilization,
        uint256 apy,
        uint256 lpShares
    ) {
        assets      = _totalAssets();
        borrowed    = totalBorrowed;
        liquidity   = USDC.balanceOf(address(this));
        utilization = _utilization();
        apy         = _currentAPY();
        lpShares    = totalShares;
    }

    // ─── Internal ───────────────────────────────────────────────────────────

    function _totalAssets() internal view returns (uint256) {
        return USDC.balanceOf(address(this)) + totalBorrowed + accruedToPool;
    }

    function _utilization() internal view returns (uint256) {
        uint256 assets = _totalAssets();
        if (assets == 0) return 0;
        return (totalBorrowed * 1e18) / assets;
    }

    function _currentAPY() internal view returns (uint256) {
        uint256 util = _utilization(); // [0, 1e18]
        return BASE_RATE + (util * RATE_SLOPE) / 1e18;
    }

    function _maxBorrow(address borrower) internal view returns (uint256) {
        uint256 score = reputationScore[borrower];
        if (score < MIN_SCORE_TO_BORROW) return 0;

        uint256 assets = _totalAssets();
        uint256 pct;

        if (score < 300) {
            pct = 50; // 0.5% of TVL
        } else if (score < 600) {
            pct = 100; // 1% of TVL
        } else if (score < 1000) {
            pct = 200; // 2% of TVL
        } else {
            pct = 300; // 3% of TVL
        }

        uint256 byScore = (assets * pct) / BASIS_POINTS;

        // Hard caps per tier (in USDC, 6 decimals)
        uint256 cap;
        if (score < 300)      cap = 1_000  * 1e6;
        else if (score < 600) cap = 5_000  * 1e6;
        else if (score < 1000)cap = 20_000 * 1e6;
        else                  cap = 50_000 * 1e6;

        return _min(byScore, cap);
    }

    function _min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }
}
