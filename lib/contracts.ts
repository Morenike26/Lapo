// ── Addresses ─────────────────────────────────────────────────────────────────

export const LAPO_ADDRESS = (
  process.env.NEXT_PUBLIC_LAPO_ADDRESS ?? "0xb19b7a93c1f0E0D502744b1fceB06e2a3AD2317b"
) as `0x${string}`;

export const ORACLE_ADDRESS = (
  process.env.NEXT_PUBLIC_ORACLE_ADDRESS ?? "0x58859f6B736779044D55355dD3f2F5a4D2192C77"
) as `0x${string}`;

export const FAUCET_ADDRESS = (
  process.env.NEXT_PUBLIC_FAUCET_ADDRESS ?? "0x5B6B09cE86443C63d31913453f90Cc7F3AA660F4"
) as `0x${string}`;

export const USDC_ADDRESS   = "0x3600000000000000000000000000000000000000" as const;
export const MWETH_ADDRESS  = (process.env.NEXT_PUBLIC_MWETH_ADDRESS ?? "0xb1d4C6590C9585c873b1eA55d0Ac6DADA1349Df0") as `0x${string}`;
export const MWBTC_ADDRESS  = (process.env.NEXT_PUBLIC_MWBTC_ADDRESS ?? "0x4f4a7381d4C5F1B8AcA8E00B9bDA4aa8426Db111") as `0x${string}`;
export const MWSOL_ADDRESS  = (process.env.NEXT_PUBLIC_MWSOL_ADDRESS ?? "0xc75761a81fc7684da0d2C6729A2123FF486b98b4") as `0x${string}`;

// ── ABIs ──────────────────────────────────────────────────────────────────────

export const ERC20_ABI = [
  { type: "function", name: "balanceOf",  inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "allowance",  inputs: [{ name: "owner",   type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "approve",    inputs: [{ name: "spender", type: "address" }, { name: "amount",  type: "uint256" }], outputs: [{ name: "", type: "bool" }],    stateMutability: "nonpayable" },
  { type: "function", name: "decimals",   inputs: [], outputs: [{ name: "", type: "uint8" }], stateMutability: "view" },
] as const;

export const ORACLE_ABI = [
  {
    type: "function", name: "getPrice",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "setPrice",
    inputs: [{ name: "token", type: "address" }, { name: "priceUSDC", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
] as const;

export const FAUCET_ABI = [
  { type: "function", name: "claim",      inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "hasClaimed", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }], stateMutability: "view" },
  { type: "function", name: "mwETH",      inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "mwBTC",      inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "mwSOL",      inputs: [], outputs: [{ name: "", type: "address" }], stateMutability: "view" },
  { type: "function", name: "CLAIM_AMOUNT", inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view" },
  { type: "event",    name: "Claimed",    inputs: [{ name: "user", type: "address", indexed: true }] },
] as const;

export const LAPO_ABI = [
  // ── Views ────────────────────────────────────────────────────────────────
  {
    type: "function", name: "poolStats", inputs: [],
    outputs: [
      { name: "assets",      type: "uint256" },
      { name: "borrowed",    type: "uint256" },
      { name: "liquidity",   type: "uint256" },
      { name: "utilization", type: "uint256" },
      { name: "apy",         type: "uint256" },
      { name: "lpShares",    type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "shares",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "lenderUSDCValue",
    inputs: [{ name: "lender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "getPosition",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "id",               type: "uint256" },
        { name: "borrower",         type: "address" },
        { name: "collateralToken",  type: "address" },
        { name: "collateralAmount", type: "uint256" },
        { name: "borrowedUSDC",     type: "uint256" },
        { name: "interestRate",     type: "uint256" },
        { name: "openedAt",         type: "uint256" },
        { name: "closed",           type: "bool" },
        { name: "liquidated",       type: "bool" },
      ],
    }],
    stateMutability: "view",
  },
  {
    type: "function", name: "getUserPositions",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "function", name: "healthFactor",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "liquidationPrice",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "accruedInterestOf",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "maxBorrowFor",
    inputs: [{ name: "token", type: "address" }, { name: "collateralAmount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "collateralValueOf",
    inputs: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  // ── Write ────────────────────────────────────────────────────────────────
  {
    type: "function", name: "deposit",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [{ name: "issued", type: "uint256" }], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "withdraw",
    inputs: [{ name: "shareAmount", type: "uint256" }],
    outputs: [{ name: "usdcOut", type: "uint256" }], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "openPosition",
    inputs: [
      { name: "collateralToken",  type: "address" },
      { name: "collateralAmount", type: "uint256" },
      { name: "borrowUSDC",       type: "uint256" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "closePosition",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "liquidate",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
  // ── Events ───────────────────────────────────────────────────────────────
  {
    type: "event", name: "Deposited",
    inputs: [
      { name: "lender",   type: "address", indexed: true  },
      { name: "usdc",     type: "uint256", indexed: false },
      { name: "lpShares", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "Withdrawn",
    inputs: [
      { name: "lender",   type: "address", indexed: true  },
      { name: "lpShares", type: "uint256", indexed: false },
      { name: "usdc",     type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PositionOpened",
    inputs: [
      { name: "id",               type: "uint256", indexed: true  },
      { name: "borrower",         type: "address", indexed: true  },
      { name: "collateralToken",  type: "address", indexed: true  },
      { name: "collateralAmount", type: "uint256", indexed: false },
      { name: "borrowedUSDC",     type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PositionClosed",
    inputs: [
      { name: "id",         type: "uint256", indexed: true  },
      { name: "borrower",   type: "address", indexed: true  },
      { name: "totalRepaid", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "PositionLiquidated",
    inputs: [
      { name: "id",         type: "uint256", indexed: true },
      { name: "borrower",   type: "address", indexed: true },
      { name: "liquidator", type: "address", indexed: true },
    ],
  },
] as const;
