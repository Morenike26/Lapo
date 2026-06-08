"use client";

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseUnits } from "viem";
import {
  LAPO_ADDRESS, ORACLE_ADDRESS, FAUCET_ADDRESS,
  USDC_ADDRESS, MWETH_ADDRESS, MWBTC_ADDRESS, MWSOL_ADDRESS,
  LAPO_ABI, ORACLE_ABI, FAUCET_ABI, ERC20_ABI,
} from "@/lib/contracts";

// Gas limits tuned for Arc's USDC precompile (~131k per USDC transfer op)
const GAS = {
  // USDC ops
  usdcApprove:     80_000n,
  deposit:        200_000n,
  withdraw:       200_000n,
  // Collateral ops (mock ERC20 is cheap, USDC transfers are the bottleneck)
  collApprove:     60_000n,
  openPosition:   450_000n, // 2× USDC.transfer + 1× collateral.transferFrom
  closePosition:  450_000n, // 1× USDC.transferFrom + 1× USDC.transfer + 1× collateral.transfer
  liquidate:      450_000n, // same pattern as closePosition
  // Faucet — 3× mock ERC20 mint (cheap)
  faucetClaim:    200_000n,
} as const;

// ── Pool ─────────────────────────────────────────────────────────────────────

export function usePoolStats() {
  return useReadContract({
    address: LAPO_ADDRESS,
    abi: LAPO_ABI,
    functionName: "poolStats",
    query: { refetchInterval: 10_000 },
  });
}

// ── Oracle ────────────────────────────────────────────────────────────────────

export function useTokenPrices() {
  return useReadContracts({
    contracts: [
      { address: ORACLE_ADDRESS, abi: ORACLE_ABI, functionName: "getPrice", args: [MWETH_ADDRESS] },
      { address: ORACLE_ADDRESS, abi: ORACLE_ABI, functionName: "getPrice", args: [MWBTC_ADDRESS] },
      { address: ORACLE_ADDRESS, abi: ORACLE_ABI, functionName: "getPrice", args: [MWSOL_ADDRESS] },
    ],
    query: { refetchInterval: 30_000 },
  });
}

// ── Lender ────────────────────────────────────────────────────────────────────

export function useLenderInfo(address?: `0x${string}`) {
  return useReadContracts({
    contracts: [
      { address: LAPO_ADDRESS, abi: LAPO_ABI,   functionName: "shares",          args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI,   functionName: "lenderUSDCValue", args: [address!] },
      { address: USDC_ADDRESS, abi: ERC20_ABI,  functionName: "balanceOf",       args: [address!] },
      { address: USDC_ADDRESS, abi: ERC20_ABI,  functionName: "allowance",       args: [address!, LAPO_ADDRESS] },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

// ── Borrower ─────────────────────────────────────────────────────────────────

export function useBorrowerInfo(address?: `0x${string}`) {
  return useReadContracts({
    contracts: [
      { address: MWETH_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address!] },
      { address: MWBTC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address!] },
      { address: MWSOL_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address!] },
      { address: MWETH_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: [address!, LAPO_ADDRESS] },
      { address: MWBTC_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: [address!, LAPO_ADDRESS] },
      { address: MWSOL_ADDRESS, abi: ERC20_ABI, functionName: "allowance", args: [address!, LAPO_ADDRESS] },
      { address: USDC_ADDRESS,  abi: ERC20_ABI, functionName: "balanceOf", args: [address!] },
      { address: LAPO_ADDRESS,  abi: LAPO_ABI,  functionName: "getUserPositions", args: [address!] },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

export function usePositionDetails(positionId: bigint | undefined) {
  return useReadContracts({
    contracts: [
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "getPosition",      args: [positionId!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "healthFactor",     args: [positionId!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "liquidationPrice", args: [positionId!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "accruedInterestOf", args: [positionId!] },
    ],
    query: { enabled: positionId !== undefined, refetchInterval: 15_000 },
  });
}

// ── Faucet ────────────────────────────────────────────────────────────────────

export function useFaucetStatus(address?: `0x${string}`) {
  return useReadContract({
    address: FAUCET_ADDRESS,
    abi: FAUCET_ABI,
    functionName: "hasClaimed",
    args: [address!],
    query: { enabled: !!address },
  });
}

// ── Write hooks ───────────────────────────────────────────────────────────────

export function useApproveUSDC() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const approve = (amount: bigint) =>
    writeContract({ address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "approve", args: [LAPO_ADDRESS, amount], gas: GAS.usdcApprove });
  return { approve, isPending, isConfirming, isSuccess, error };
}

export function useApproveCollateral() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const approve = (tokenAddress: `0x${string}`, amount: bigint) =>
    writeContract({ address: tokenAddress, abi: ERC20_ABI, functionName: "approve", args: [LAPO_ADDRESS, amount], gas: GAS.collApprove });
  return { approve, isPending, isConfirming, isSuccess, error };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const deposit = (amount: string) =>
    writeContract({ address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "deposit", args: [parseUnits(amount, 6)], gas: GAS.deposit });
  return { deposit, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withdraw = (shares: bigint) =>
    writeContract({ address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "withdraw", args: [shares], gas: GAS.withdraw });
  return { withdraw, isPending, isConfirming, isSuccess, error };
}

export function useOpenPosition() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const openPosition = (collateralToken: `0x${string}`, collateralAmount: bigint, borrowUSDC: string) =>
    writeContract({
      address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "openPosition",
      args: [collateralToken, collateralAmount, parseUnits(borrowUSDC, 6)],
      gas: GAS.openPosition,
    });
  return { openPosition, isPending, isConfirming, isSuccess, error };
}

export function useClosePosition() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const closePosition = (positionId: bigint) =>
    writeContract({ address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "closePosition", args: [positionId], gas: GAS.closePosition });
  return { closePosition, isPending, isConfirming, isSuccess, error };
}

export function useLiquidate() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const liquidate = (positionId: bigint) =>
    writeContract({ address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "liquidate", args: [positionId], gas: GAS.liquidate });
  return { liquidate, isPending, isConfirming, isSuccess, error };
}

export function useFaucetClaim() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const claim = () =>
    writeContract({ address: FAUCET_ADDRESS, abi: FAUCET_ABI, functionName: "claim", args: [], gas: GAS.faucetClaim });
  return { claim, isPending, isConfirming, isSuccess, error };
}

// Re-export for lend page (unchanged interface)
export { useApproveUSDC as useApprove };
