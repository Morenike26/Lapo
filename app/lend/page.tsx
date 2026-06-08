"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { CheckCircle } from "lucide-react";
import {
  usePoolStats,
  useLenderInfo,
  useApprove,
  useDeposit,
  useWithdraw,
} from "@/hooks/useLapo";
import { StatCard } from "@/components/StatCard";
import { TxButton } from "@/components/TxButton";
import { formatUSDC, formatBps, formatUtilization, cn } from "@/lib/utils";
import { parseUnits } from "viem";

type Tab = "deposit" | "withdraw";

export default function LendPage() {
  const { address, isConnected } = useAccount();
  const { data: stats } = usePoolStats();
  const { data: lenderData, refetch } = useLenderInfo(address);

  const [tab, setTab]       = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [txMsg, setTxMsg]   = useState<string | null>(null);

  const tvl         = stats?.[0] ?? 0n;
  const borrowed    = stats?.[1] ?? 0n;
  const utilization = stats?.[3] ?? 0n;
  const apy         = stats?.[4] ?? 0n;

  const myShares    = (lenderData?.[0]?.result as bigint | undefined) ?? 0n;
  const myUSDCValue = (lenderData?.[1]?.result as bigint | undefined) ?? 0n;
  const usdcBal     = (lenderData?.[2]?.result as bigint | undefined) ?? 0n;
  const allowance   = (lenderData?.[3]?.result as bigint | undefined) ?? 0n;

  const totalShares = stats?.[5] ?? 0n;
  const poolShare   = totalShares > 0n
    ? ((Number(myShares) / Number(totalShares)) * 100).toFixed(2)
    : "0.00";

  const needsApproval = tab === "deposit" && amount
    ? allowance < parseUnits(amount || "0", 6)
    : false;

  const approve  = useApprove();
  const deposit  = useDeposit();
  const withdraw = useWithdraw();

  const isLoading = approve.isPending || approve.isConfirming ||
    deposit.isPending || deposit.isConfirming ||
    withdraw.isPending || withdraw.isConfirming;

  useEffect(() => {
    if (deposit.isSuccess || withdraw.isSuccess) {
      refetch();
      setAmount("");
      setTxMsg(deposit.isSuccess ? "Deposit confirmed." : "Withdrawal confirmed.");
      setTimeout(() => setTxMsg(null), 4000);
    }
  }, [deposit.isSuccess, withdraw.isSuccess]);

  useEffect(() => {
    if (approve.isSuccess) {
      refetch();
      setTxMsg("Approved. You can now deposit.");
      setTimeout(() => setTxMsg(null), 4000);
    }
  }, [approve.isSuccess]);

  const parsedAmount = amount ? parseUnits(amount, 6) : 0n;

  // Balance checks
  const insufficientBalance = tab === "deposit"
    ? parsedAmount > usdcBal
    : parsedAmount > myUSDCValue;

  const handleAction = () => {
    if (!amount) return;
    if (tab === "deposit") {
      if (needsApproval) { approve.approve(parsedAmount); return; }
      deposit.deposit(amount);
    } else {
      if (myUSDCValue === 0n || myShares === 0n) return;
      const sharesToBurn = (parsedAmount * myShares) / myUSDCValue;
      withdraw.withdraw(sharesToBurn);
    }
  };

  const maxAmount = tab === "deposit"
    ? formatUSDC(usdcBal, 6).replace(/,/g, "")
    : formatUSDC(myUSDCValue, 6).replace(/,/g, "");

  const actionLabel = tab === "deposit"
    ? (needsApproval ? "Approve USDC" : "Deposit")
    : "Withdraw";

  const loadingText = approve.isPending || approve.isConfirming ? "Approving…" : "Confirming…";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Lend</h1>
        <p className="text-lapo-muted">
          Deposit USDC into the pool and collect your share of every loan that gets repaid.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 border-b border-lapo-border pb-10 mb-10">
        <StatCard label="Pool TVL"       value={`$${formatUSDC(tvl)}`}                 accent />
        <StatCard label="Total Borrowed" value={`$${formatUSDC(borrowed)}`}             />
        <StatCard label="Utilization"    value={`${formatUtilization(utilization)}%`}   />
        <StatCard label="Current APY"   value={`${formatBps(apy)}%`}                  cyan />
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* Left: position sidebar */}
        <div className="lg:col-span-2 space-y-8">
          {isConnected ? (
            <>
              <div>
                <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
                  My Position
                </p>
                <p className="text-4xl font-bold mb-1">${formatUSDC(myUSDCValue)}</p>
                <p className="text-sm text-lapo-muted">deposited value</p>
              </div>
              <div className="border-t border-lapo-border pt-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">Pool share</span>
                  <span className="font-semibold text-lapo-cyan">{poolShare}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">LP shares</span>
                  <span className="font-mono text-xs text-lapo-muted">{formatUSDC(myShares, 4)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">Wallet balance</span>
                  <span>${formatUSDC(usdcBal)} USDC</span>
                </div>
              </div>
              <div className="border-t border-lapo-border pt-6">
                <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-3">
                  Rate model
                </p>
                <p className="text-sm text-lapo-muted leading-relaxed">
                  <span className="text-white font-mono text-xs">5% + utilization × 45%</span>
                  <br />
                  Starts at 5% and goes up to 50% as more of the pool gets borrowed out.
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-lapo-muted pt-2">
              Connect your wallet to see your position.
            </p>
          )}
        </div>

        {/* Right: action panel */}
        <div className="lg:col-span-3">
          {/* Underline tab selector */}
          <div className="flex gap-8 border-b border-lapo-border mb-8">
            {(["deposit", "withdraw"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setAmount(""); }}
                className={cn(
                  "pb-3 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px",
                  tab === t
                    ? "text-white border-lapo-blue"
                    : "text-lapo-muted border-transparent hover:text-white/60"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {!isConnected ? (
            <p className="text-sm text-lapo-muted">Connect your wallet to deposit or withdraw.</p>
          ) : (
            <div className="space-y-8">
              {/* Underline-style amount input */}
              <div className="border-b border-lapo-border focus-within:border-lapo-blue pb-3 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-lapo-muted uppercase tracking-[0.14em]">Amount</span>
                  <button
                    onClick={() => setAmount(maxAmount)}
                    className="text-xs font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors"
                  >
                    MAX &nbsp;
                    <span className="text-lapo-muted font-normal">
                      ${tab === "deposit" ? formatUSDC(usdcBal) : formatUSDC(myUSDCValue)}
                    </span>
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-lapo-muted/20 focus:outline-none"
                  />
                  <span className="text-lapo-muted font-medium pb-1">USDC</span>
                </div>
              </div>

              {/* Preview */}
              {amount && Number(amount) > 0 && (
                <div className="space-y-3 text-sm animate-fade-up">
                  {tab === "deposit" ? (
                    <>
                      <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                        <span className="text-lapo-muted">You deposit</span>
                        <span>${Number(amount).toLocaleString()} USDC</span>
                      </div>
                      <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                        <span className="text-lapo-muted">Current APY</span>
                        <span className="text-lapo-cyan">{formatBps(apy)}%</span>
                      </div>
                      {needsApproval && (
                        <p className="text-[11px] text-lapo-muted/60">Step 1 of 2 — Approve then Deposit</p>
                      )}
                    </>
                  ) : (
                    <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                      <span className="text-lapo-muted">You receive</span>
                      <span>≈ ${Number(amount).toLocaleString()} USDC</span>
                    </div>
                  )}
                </div>
              )}

              {txMsg && (
                <div className="flex items-center gap-2 text-green-400 text-sm animate-fade-up">
                  <CheckCircle size={14} />
                  {txMsg}
                </div>
              )}

              {(deposit.error || withdraw.error || approve.error) && (
                <p className="text-xs text-red-400">
                  {(deposit.error || withdraw.error || approve.error)?.message?.slice(0, 140)}
                </p>
              )}

              {insufficientBalance && amount && Number(amount) > 0 && (
                <p className="text-xs text-red-400">
                  Insufficient balance. You have ${formatUSDC(tab === "deposit" ? usdcBal : myUSDCValue)} available.
                </p>
              )}

              <TxButton
                onClick={handleAction}
                disabled={!amount || Number(amount) <= 0 || insufficientBalance}
                loading={isLoading}
                loadingText={loadingText}
              >
                {actionLabel}
              </TxButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
