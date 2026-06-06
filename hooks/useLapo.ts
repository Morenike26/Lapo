"use client";

import {
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { parseUnits, maxUint256 } from "viem";
import { LAPO_ADDRESS, USDC_ADDRESS, LAPO_ABI, ERC20_ABI } from "@/lib/contracts";

export function usePoolStats() {
  return useReadContract({
    address: LAPO_ADDRESS,
    abi: LAPO_ABI,
    functionName: "poolStats",
    query: { refetchInterval: 10_000 },
  });
}

export function useLenderInfo(address?: `0x${string}`) {
  return useReadContracts({
    contracts: [
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "shares", args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "lenderUSDCValue", args: [address!] },
      { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf", args: [address!] },
      {
        address: USDC_ADDRESS, abi: ERC20_ABI,
        functionName: "allowance", args: [address!, LAPO_ADDRESS],
      },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

export function useBorrowerInfo(address?: `0x${string}`) {
  return useReadContracts({
    contracts: [
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "reputationScore",  args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "completedLoans",   args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "defaultedLoans",   args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "maxBorrowAmount",  args: [address!] },
      { address: LAPO_ADDRESS, abi: LAPO_ABI, functionName: "getBorrowerLoans", args: [address!] },
      { address: USDC_ADDRESS, abi: ERC20_ABI, functionName: "balanceOf",       args: [address!] },
      {
        address: USDC_ADDRESS, abi: ERC20_ABI,
        functionName: "allowance", args: [address!, LAPO_ADDRESS],
      },
    ],
    query: { enabled: !!address, refetchInterval: 10_000 },
  });
}

export function useLoanDetails(loanId: bigint | undefined) {
  return useReadContract({
    address: LAPO_ADDRESS,
    abi: LAPO_ABI,
    functionName: "getLoan",
    args: [loanId!],
    query: { enabled: loanId !== undefined },
  });
}

// ── Write hooks ─────────────────────────────────────────────────────────────

export function useApprove() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount?: bigint) =>
    writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [LAPO_ADDRESS, amount ?? maxUint256],
    });

  return { approve, isPending, isConfirming, isSuccess, error };
}

export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (amount: string) =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "deposit",
      args: [parseUnits(amount, 18)],
    });

  return { deposit, isPending, isConfirming, isSuccess, error };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (shares: bigint) =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "withdraw",
      args: [shares],
    });

  return { withdraw, isPending, isConfirming, isSuccess, error };
}

export function useBootstrap() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const bootstrap = () =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "bootstrapReputation",
      args: [],
    });

  return { bootstrap, isPending, isConfirming, isSuccess, error };
}

export function useRequestLoan() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const requestLoan = (amount: string, duration: number) =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "requestLoan",
      args: [parseUnits(amount, 18), BigInt(duration)],
    });

  return { requestLoan, isPending, isConfirming, isSuccess, error };
}

export function useRepayLoan() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const repay = (loanId: bigint) =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "repayLoan",
      args: [loanId],
    });

  return { repay, isPending, isConfirming, isSuccess, error };
}

export function useMarkDefault() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const markDefault = (loanId: bigint) =>
    writeContract({
      address: LAPO_ADDRESS,
      abi: LAPO_ABI,
      functionName: "markDefault",
      args: [loanId],
    });

  return { markDefault, isPending, isConfirming, isSuccess, error };
}
