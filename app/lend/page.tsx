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
    ? allowance < parseUnits(amount || "0", 18)
    : false;

  const approve  = useApprove();
  const deposit  = useDeposit();
  const withdraw = useWithdraw();

  const isLoading = approve.isPending || approve.isConfirming ||
    deposit.isPending || deposit.isConfirming ||
    withdraw.isPending || withdraw.isConfirming;

  useEffect(() => {
    if (deposit.isSuccess || withdraw.isSuccess || approve.isSuccess) {
      refetch();
      setAmount("");
      setTxMsg(
        deposit.isSuccess  ? "Deposit confirmed." :
        withdraw.isSuccess ? "Withdrawal confirmed." :
        "Approved. You can now deposit."
      );
      setTimeout(() => setTxMsg(null), 4000);
    }
  }, [deposit.isSuccess, withdraw.isSuccess, approve.isSuccess]);

  const handleAction = () => {
    if (!amount) return;
    if (tab === "deposit") {
      if (needsApproval) { approve.approve(); return; }
      deposit.deposit(amount);
    } else {
      if (myUSDCValue === 0n || myShares === 0n) return;
      const sharesToBurn = (parseUnits(amount, 18) * myShares) / myUSDCValue;
      withdraw.withdraw(sharesToBurn);
    }
  };

  const maxAmount = tab === "deposit"
    ? formatUSDC(usdcBal, 6).replace(/,/g, "")
    : formatUSDC(myUSDCValue, 6).replace(/,/g, "");

  const actionLabel = () => {
    if (tab === "deposit") return needsApproval ? "Approve USDC" : "Deposit";
    return "Withdraw";
  };

  const loadingText = () => {
    if (approve.isPending || approve.isConfirming) return "Approving…";
    return "Confirming…";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Lend</h1>
        <p className="text-lapo-muted">
          Deposit USDC into the pool and collect your share of every loan that gets repaid.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Stats */}
        <div className="space-y-4">
          <StatCard label="Pool TVL"       value={`$${formatUSDC(tvl)}`}    accent />
          <StatCard label="Total Borrowed" value={`$${formatUSDC(borrowed)}`} />
          <StatCard label="Utilization"    value={`${formatUtilization(utilization)}%`} />
          <StatCard label="Current APY"   value={`${formatBps(apy)}%`}    cyan />

          {isConnected && (
            <div className="bg-lapo-card border border-lapo-border rounded-2xl p-5 space-y-3">
              <p className="text-xs font-medium text-lapo-muted uppercase tracking-wider">My Position</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">Deposited value</span>
                  <span className="font-semibold text-white">${formatUSDC(myUSDCValue)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">Pool share</span>
                  <span className="font-semibold text-lapo-cyan">{poolShare}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-lapo-muted">LP shares</span>
                  <span className="font-mono text-xs text-lapo-muted">{formatUSDC(myShares, 4)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Action panel */}
        <div className="lg:col-span-2">
          <div className="bg-lapo-card border border-lapo-border rounded-2xl overflow-hidden">
            <div className="flex border-b border-lapo-border">
              {(["deposit", "withdraw"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setAmount(""); }}
                  className={cn(
                    "flex-1 py-4 text-sm font-semibold capitalize transition-colors",
                    tab === t
                      ? "text-lapo-blue border-b-2 border-lapo-blue bg-lapo-blue/5"
                      : "text-lapo-muted hover:text-white"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-5">
              {!isConnected ? (
                <div className="text-center py-10 text-lapo-muted">
                  <p className="text-sm">Connect your wallet to deposit or withdraw.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-lapo-muted mb-2">
                      Amount (USDC)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full bg-lapo-dark border border-lapo-border rounded-xl px-4 py-3.5 text-lg font-semibold text-white placeholder:text-lapo-muted/40 focus:outline-none focus:border-lapo-blue/60 transition-colors"
                      />
                      <button
                        onClick={() => setAmount(maxAmount)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors px-2 py-1 rounded-md hover:bg-lapo-blue/10"
                      >
                        MAX
                      </button>
                    </div>
                    <p className="text-xs text-lapo-muted mt-1.5">
                      {tab === "deposit"
                        ? `Wallet balance: $${formatUSDC(usdcBal)}`
                        : `Available to withdraw: $${formatUSDC(myUSDCValue)}`}
                    </p>
                  </div>

                  {amount && Number(amount) > 0 && (
                    <div className="bg-lapo-dark/60 border border-lapo-border/60 rounded-xl p-4 space-y-2 text-sm">
                      {tab === "deposit" ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-lapo-muted">You deposit</span>
                            <span>${Number(amount).toLocaleString()} USDC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-lapo-muted">Current APY</span>
                            <span className="text-lapo-cyan">{formatBps(apy)}%</span>
                          </div>
                          {needsApproval && (
                            <div className="flex justify-between text-lapo-muted/70">
                              <span>Step 1 of 2</span>
                              <span>Approve then Deposit</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-lapo-muted">You receive</span>
                          <span>≈ ${Number(amount).toLocaleString()} USDC</span>
                        </div>
                      )}
                    </div>
                  )}

                  {txMsg && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-fade-up">
                      <CheckCircle size={16} />
                      {txMsg}
                    </div>
                  )}

                  {(deposit.error || withdraw.error || approve.error) && (
                    <p className="text-xs text-red-400 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                      {(deposit.error || withdraw.error || approve.error)?.message?.slice(0, 160)}
                    </p>
                  )}

                  <TxButton
                    onClick={handleAction}
                    disabled={!amount || Number(amount) <= 0}
                    loading={isLoading}
                    loadingText={loadingText()}
                  >
                    {actionLabel()}
                  </TxButton>
                </>
              )}
            </div>
          </div>

          <div className="mt-4 bg-lapo-card border border-lapo-border rounded-2xl p-5">
            <p className="text-xs font-medium text-lapo-muted uppercase tracking-wider mb-3">How the rate works</p>
            <p className="text-sm text-lapo-muted leading-relaxed">
              APY = <span className="text-white font-mono">5% + utilization × 45%</span>.
              At 0% utilization you earn a base 5%. As the pool gets deployed into loans,
              rates climb linearly up to 50% at full utilization. Your yield grows as borrowers repay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
