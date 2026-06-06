export const LAPO_ADDRESS = (
  process.env.NEXT_PUBLIC_LAPO_ADDRESS ?? "0xe8cf0565e855e05662f2218e5f21178184080757"
) as `0x${string}`;

export const USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export const ERC20_ABI = [
  {
    type: "function", name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "allowance",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "approve",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }], stateMutability: "nonpayable",
  },
] as const;

export const LAPO_ABI = [
  // ── Views ──────────────────────────────────────────────────────────────────
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
    type: "function", name: "totalShares",
    inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "lenderUSDCValue",
    inputs: [{ name: "lender", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "reputationScore",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "completedLoans",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "defaultedLoans",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "maxBorrowAmount",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  {
    type: "function", name: "getBorrowerLoans",
    inputs: [{ name: "borrower", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }], stateMutability: "view",
  },
  {
    type: "function", name: "getLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "id",             type: "uint256" },
          { name: "borrower",       type: "address" },
          { name: "principal",      type: "uint256" },
          { name: "interestDue",    type: "uint256" },
          { name: "originationFee", type: "uint256" },
          { name: "startTime",      type: "uint256" },
          { name: "dueDate",        type: "uint256" },
          { name: "repaidAt",       type: "uint256" },
          { name: "repaid",         type: "bool" },
          { name: "defaulted",      type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function", name: "nextLoanId",
    inputs: [], outputs: [{ name: "", type: "uint256" }], stateMutability: "view",
  },
  // ── Write ──────────────────────────────────────────────────────────────────
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
    type: "function", name: "bootstrapReputation", inputs: [],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "requestLoan",
    inputs: [{ name: "principal", type: "uint256" }, { name: "duration", type: "uint256" }],
    outputs: [{ name: "loanId", type: "uint256" }], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "repayLoan",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
  {
    type: "function", name: "markDefault",
    inputs: [{ name: "loanId", type: "uint256" }],
    outputs: [], stateMutability: "nonpayable",
  },
  // ── Events ─────────────────────────────────────────────────────────────────
  {
    type: "event", name: "Deposited",
    inputs: [
      { name: "lender", type: "address", indexed: true },
      { name: "usdc",   type: "uint256", indexed: false },
      { name: "shares", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "Withdrawn",
    inputs: [
      { name: "lender",    type: "address", indexed: true },
      { name: "shares",    type: "uint256", indexed: false },
      { name: "usdc",      type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "LoanCreated",
    inputs: [
      { name: "loanId",   type: "uint256", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "principal", type: "uint256", indexed: false },
      { name: "dueDate",  type: "uint256", indexed: false },
    ],
  },
  {
    type: "event", name: "LoanRepaid",
    inputs: [
      { name: "loanId",   type: "uint256", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "interest", type: "uint256", indexed: false },
      { name: "onTime",   type: "bool",    indexed: false },
    ],
  },
  {
    type: "event", name: "ScoreUpdated",
    inputs: [
      { name: "borrower",  type: "address", indexed: true },
      { name: "oldScore",  type: "uint256", indexed: false },
      { name: "newScore",  type: "uint256", indexed: false },
    ],
  },
] as const;
