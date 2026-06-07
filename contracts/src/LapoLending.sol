// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

/**
 * @title LapoLending
 * @notice Permissionless collateral-backed USDC lending on Arc Testnet.
 *
 * Lenders deposit USDC and receive LP shares that appreciate as interest accrues.
 * Borrowers deposit mwETH / mwBTC / mwSOL as collateral and borrow USDC against it.
 *
 * Collateral ratios:
 *   Min to open:       135% (borrow 100 USDC → need $135 of collateral)
 *   Liquidation:       105% (position health drops to 1.05× → anyone can liquidate)
 *
 * Fee structure:
 *   0.5% origination fee on every loan → treasury
 *   10% of accrued interest on close / liquidation → treasury
 *   90% of accrued interest → lending pool (lender yield)
 *
 * Liquidation:
 *   Liquidator repays the full outstanding debt (principal + interest).
 *   Liquidator receives all posted collateral (worth ~1.05× debt at trigger).
 *   The ~5% excess in collateral value is the liquidator's incentive and the
 *   protocol's safety buffer — ensuring lenders are always made whole.
 *
 * Interest model (utilization-based, snapshotted at position open):
 *   APY (bps) = 500 + utilization × 4500
 */
contract LapoLending {

    // ── Constants ────────────────────────────────────────────────────────────

    uint256 public constant BASIS_POINTS        = 10_000;
    uint256 public constant ORIGINATION_FEE     = 50;      // 0.5 %
    uint256 public constant PROTOCOL_CUT        = 1_000;   // 10 % of interest
    uint256 public constant BASE_RATE           = 500;     // 5 % floor APY
    uint256 public constant RATE_SLOPE          = 4_500;   // + 45 % at 100 % util
    uint256 public constant SECONDS_PER_YEAR    = 365 days;
    uint256 public constant MIN_COLLATERAL_PCT  = 135;     // open threshold
    uint256 public constant LIQUIDATION_PCT     = 105;     // liquidation threshold

    // ── State ────────────────────────────────────────────────────────────────

    IERC20        public immutable USDC;
    IPriceOracle  public oracle;
    address       public owner;
    address       public treasury;

    // Lending pool
    uint256 public totalShares;
    uint256 public totalDeposited;
    uint256 public totalBorrowed;
    uint256 public accruedToPool;

    mapping(address => uint256) public shares;
    mapping(address => bool)    public supportedCollateral;

    // Collateral positions
    struct Position {
        uint256 id;
        address borrower;
        address collateralToken;
        uint256 collateralAmount; // 1e18 base units
        uint256 borrowedUSDC;     // principal, 6 dec
        uint256 interestRate;     // APY in bps, snapshotted at open
        uint256 openedAt;
        bool    closed;
        bool    liquidated;
    }

    uint256 public nextPositionId;
    mapping(uint256 => Position)    public positions;
    mapping(address => uint256[])   public userPositions;

    // ── Events ───────────────────────────────────────────────────────────────

    event Deposited(address indexed lender, uint256 usdc, uint256 lpShares);
    event Withdrawn(address indexed lender, uint256 lpShares, uint256 usdc);
    event PositionOpened(
        uint256 indexed id,
        address indexed borrower,
        address indexed collateralToken,
        uint256 collateralAmount,
        uint256 borrowedUSDC
    );
    event PositionClosed(uint256 indexed id, address indexed borrower, uint256 totalRepaid);
    event PositionLiquidated(uint256 indexed id, address indexed borrower, address indexed liquidator);

    // ── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error ZeroAmount();
    error ZeroShares();
    error UnsupportedCollateral();
    error InsufficientCollateral();
    error InsufficientLiquidity();
    error PositionNotOpen();
    error NotBorrower();
    error PositionHealthy();
    error WithdrawalExceedsLiquidity();

    // ── Modifier ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _oracle, address _treasury) {
        USDC     = IERC20(_usdc);
        oracle   = IPriceOracle(_oracle);
        owner    = msg.sender;
        treasury = _treasury;
    }

    // ── Lender: Deposit ──────────────────────────────────────────────────────

    function deposit(uint256 amount) external returns (uint256 issued) {
        if (amount == 0) revert ZeroAmount();

        uint256 poolAssets = _totalAssets();
        if (totalShares == 0 || poolAssets == 0) {
            issued = amount;
        } else {
            issued = (amount * totalShares) / poolAssets;
        }
        if (issued == 0) revert ZeroShares();

        totalShares        += issued;
        totalDeposited     += amount;
        shares[msg.sender] += issued;

        require(USDC.transferFrom(msg.sender, address(this), amount), "transfer failed");
        emit Deposited(msg.sender, amount, issued);
    }

    // ── Lender: Withdraw ─────────────────────────────────────────────────────

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

    // ── Borrower: Open Position ──────────────────────────────────────────────

    function openPosition(
        address collateralToken,
        uint256 collateralAmount,
        uint256 borrowUSDC
    ) external returns (uint256 positionId) {
        if (!supportedCollateral[collateralToken]) revert UnsupportedCollateral();
        if (collateralAmount == 0 || borrowUSDC == 0) revert ZeroAmount();

        uint256 colValue = _collateralValue(collateralToken, collateralAmount);
        if (colValue * 100 < borrowUSDC * MIN_COLLATERAL_PCT) revert InsufficientCollateral();

        uint256 available = USDC.balanceOf(address(this));
        if (borrowUSDC > available) revert InsufficientLiquidity();

        uint256 fee       = (borrowUSDC * ORIGINATION_FEE) / BASIS_POINTS;
        uint256 disbursed = borrowUSDC - fee;

        positionId = nextPositionId++;
        positions[positionId] = Position({
            id:               positionId,
            borrower:         msg.sender,
            collateralToken:  collateralToken,
            collateralAmount: collateralAmount,
            borrowedUSDC:     borrowUSDC,
            interestRate:     _currentAPY(),
            openedAt:         block.timestamp,
            closed:           false,
            liquidated:       false
        });
        userPositions[msg.sender].push(positionId);
        totalBorrowed += borrowUSDC;

        require(
            IERC20(collateralToken).transferFrom(msg.sender, address(this), collateralAmount),
            "collateral transfer failed"
        );
        require(USDC.transfer(treasury, fee),       "fee failed");
        require(USDC.transfer(msg.sender, disbursed), "disburse failed");

        emit PositionOpened(positionId, msg.sender, collateralToken, collateralAmount, borrowUSDC);
    }

    // ── Borrower: Close Position ─────────────────────────────────────────────

    function closePosition(uint256 positionId) external {
        Position storage pos = positions[positionId];
        if (pos.borrower == address(0)) revert PositionNotOpen();
        if (msg.sender != pos.borrower) revert NotBorrower();
        if (pos.closed || pos.liquidated) revert PositionNotOpen();

        uint256 interest = _accruedInterest(pos);
        uint256 total    = pos.borrowedUSDC + interest;

        uint256 protocolInterest = (interest * PROTOCOL_CUT) / BASIS_POINTS;
        uint256 poolInterest     = interest - protocolInterest;

        pos.closed     = true;
        totalBorrowed -= pos.borrowedUSDC;
        accruedToPool += poolInterest;

        address collToken   = pos.collateralToken;
        uint256 collAmount  = pos.collateralAmount;

        require(USDC.transferFrom(msg.sender, address(this), total), "repay failed");
        if (protocolInterest > 0) {
            require(USDC.transfer(treasury, protocolInterest), "fee failed");
        }
        require(IERC20(collToken).transfer(msg.sender, collAmount), "collateral return failed");

        emit PositionClosed(positionId, msg.sender, total);
    }

    // ── Liquidate ────────────────────────────────────────────────────────────

    function liquidate(uint256 positionId) external {
        Position storage pos = positions[positionId];
        if (pos.borrower == address(0)) revert PositionNotOpen();
        if (pos.closed || pos.liquidated) revert PositionNotOpen();

        uint256 interest  = _accruedInterest(pos);
        uint256 totalDebt = pos.borrowedUSDC + interest;

        uint256 colValue = _collateralValue(pos.collateralToken, pos.collateralAmount);
        if (colValue * 100 >= totalDebt * LIQUIDATION_PCT) revert PositionHealthy();

        uint256 protocolInterest = (interest * PROTOCOL_CUT) / BASIS_POINTS;
        uint256 poolInterest     = interest - protocolInterest;

        pos.liquidated = true;
        totalBorrowed -= pos.borrowedUSDC;
        accruedToPool += poolInterest;

        address collToken  = pos.collateralToken;
        uint256 collAmount = pos.collateralAmount;

        require(USDC.transferFrom(msg.sender, address(this), totalDebt), "repay failed");
        if (protocolInterest > 0) {
            require(USDC.transfer(treasury, protocolInterest), "fee failed");
        }
        require(IERC20(collToken).transfer(msg.sender, collAmount), "collateral transfer failed");

        emit PositionLiquidated(positionId, pos.borrower, msg.sender);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function healthFactor(uint256 positionId) external view returns (uint256) {
        Position storage pos = positions[positionId];
        if (pos.closed || pos.liquidated || pos.borrower == address(0)) return 0;
        uint256 interest  = _accruedInterest(pos);
        uint256 totalDebt = pos.borrowedUSDC + interest;
        if (totalDebt == 0) return type(uint256).max;
        uint256 colValue = _collateralValue(pos.collateralToken, pos.collateralAmount);
        return (colValue * 100) / totalDebt;
    }

    function collateralValueOf(address token, uint256 amount) external view returns (uint256) {
        return _collateralValue(token, amount);
    }

    function accruedInterestOf(uint256 positionId) external view returns (uint256) {
        return _accruedInterest(positions[positionId]);
    }

    function maxBorrowFor(address token, uint256 collateralAmount) external view returns (uint256) {
        uint256 colValue = _collateralValue(token, collateralAmount);
        return (colValue * 100) / MIN_COLLATERAL_PCT;
    }

    // Price at which the given position hits the liquidation threshold.
    // Returns 0 for closed / liquidated positions.
    function liquidationPrice(uint256 positionId) external view returns (uint256) {
        Position storage pos = positions[positionId];
        if (pos.closed || pos.liquidated || pos.borrower == address(0)) return 0;
        uint256 interest  = _accruedInterest(pos);
        uint256 totalDebt = pos.borrowedUSDC + interest;
        // colValue at liq = totalDebt * 1.05  →  price = totalDebt * 105 / 100 / amount * 1e18
        return (totalDebt * LIQUIDATION_PCT * 1e18) / (pos.collateralAmount * 100);
    }

    function getPosition(uint256 positionId) external view returns (Position memory) {
        return positions[positionId];
    }

    function getUserPositions(address user) external view returns (uint256[] memory) {
        return userPositions[user];
    }

    function lenderUSDCValue(address lender) external view returns (uint256) {
        if (totalShares == 0) return 0;
        return (shares[lender] * _totalAssets()) / totalShares;
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

    // ── Admin ────────────────────────────────────────────────────────────────

    function setSupportedCollateral(address token, bool supported) external onlyOwner {
        supportedCollateral[token] = supported;
    }

    function setOracle(address _oracle) external onlyOwner {
        oracle = IPriceOracle(_oracle);
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function transferOwnership(address _owner) external onlyOwner {
        owner = _owner;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _totalAssets() internal view returns (uint256) {
        return USDC.balanceOf(address(this)) + totalBorrowed + accruedToPool;
    }

    function _utilization() internal view returns (uint256) {
        uint256 assets = _totalAssets();
        if (assets == 0) return 0;
        return (totalBorrowed * 1e18) / assets;
    }

    function _currentAPY() internal view returns (uint256) {
        return BASE_RATE + (_utilization() * RATE_SLOPE) / 1e18;
    }

    function _collateralValue(address token, uint256 amount) internal view returns (uint256) {
        return (amount * oracle.getPrice(token)) / 1e18;
    }

    function _accruedInterest(Position storage pos) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - pos.openedAt;
        return (pos.borrowedUSDC * pos.interestRate * elapsed) / (BASIS_POINTS * SECONDS_PER_YEAR);
    }
}
