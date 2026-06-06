"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import {
  useBorrowerInfo,
  usePoolStats,
  useBootstrap,
  useApprove,
  useRequestLoan,
  useRepayLoan,
  useMarkDefault,
  useLoanDetails,
} from "@/hooks/useLapo";
import { ReputationBar } from "@/components/ReputationBar";
import { TxButton } from "@/components/TxButton";
import { StatCard } from "@/components/StatCard";
import { formatUSDC, formatBps, durationLabel, timeLeft, cn } from "@/lib/utils";
import { parseUnits } from "viem";

const DURATIONS = [
  { label: "30 days", value: 30 * 86400 },
  { label: "60 days", value: 60 * 86400 },
  { label: "90 days", value: 90 * 86400 },
];

function LoanRow({
  loanId,
  onRepay,
  onDefault,
  repaying,
}: {
  loanId: bigint;
  onRepay: (id: bigint) => void;
  onDefault: (id: bigint) => void;
  repaying: boolean;
}) {
  const { data: loan } = useLoanDetails(loanId);
  if (!loan) return null;

  const isOverdue = !loan.repaid && !loan.defaulted &&
    BigInt(Math.floor(Date.now() / 1000)) > loan.dueDate + 3n * 86400n;

  const status = loan.repaid
    ? "Repaid"
    : loan.defaulted
    ? "Defaulted"
    : isOverdue
    ? "Overdue"
    : "Active";

  const statusColor = {
    Repaid:    "text-green-400 bg-green-500/10 border-green-500/20",
    Active:    "text-lapo-cyan bg-lapo-cyan/10 border-lapo-cyan/20",
    Overdue:   "text-red-400 bg-red-500/10 border-red-500/20",
    Defaulted: "text-red-400 bg-red-500/10 border-red-500/20",
  }[status];

  const total = loan.principal + loan.interestDue;

  return (
    <div className="bg-lapo-dark/50 border border-lapo-border rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-lapo-muted font-mono">Loan #{loanId.toString()}</p>
          <p className="text-lg font-semibold">${formatUSDC(loan.principal)} USDC</p>
        </div>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full border", statusColor)}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-lapo-muted">Principal</p>
          <p className="font-medium">${formatUSDC(loan.principal)}</p>
        </div>
        <div>
          <p className="text-lapo-muted">Interest</p>
          <p className="font-medium">${formatUSDC(loan.interestDue)}</p>
        </div>
        <div>
          <p className="text-lapo-muted">Due</p>
          <p className="font-medium">{timeLeft(loan.dueDate)}</p>
        </div>
      </div>

      {!loan.repaid && !loan.defaulted && (
        <div className="flex gap-2 pt-1">
          <TxButton
            onClick={() => onRepay(loanId)}
            loading={repaying}
            loadingText="Repaying…"
            className="flex-1"
            variant="primary"
          >
            Repay ${formatUSDC(total)}
          </TxButton>
          {isOverdue && (
            <TxButton
              onClick={() => onDefault(loanId)}
              loading={false}
              variant="danger"
              className="flex-none px-3 !w-auto"
            >
              Mark Default
            </TxButton>
          )}
        </div>
      )}
    </div>
  );
}

export default function BorrowPage() {
  const { address, isConnected } = useAccount();
  const { data: stats } = usePoolStats();
  const { data: borrowerData, refetch } = useBorrowerInfo(address);

  const [amount, setAmount]     = useState("");
  const [duration, setDuration] = useState(DURATIONS[0].value);
  const [txMsg, setTxMsg]       = useState<string | null>(null);

  const score       = (borrowerData?.[0]?.result as bigint | undefined) ?? 0n;
  const completed   = (borrowerData?.[1]?.result as bigint | undefined) ?? 0n;
  const defaulted   = (borrowerData?.[2]?.result as bigint | undefined) ?? 0n;
  const maxBorrow   = (borrowerData?.[3]?.result as bigint | undefined) ?? 0n;
  const loanIds     = (borrowerData?.[4]?.result as bigint[] | undefined) ?? [];
  const usdcBal     = (borrowerData?.[5]?.result as bigint | undefined) ?? 0n;
  const allowance   = (borrowerData?.[6]?.result as bigint | undefined) ?? 0n;

  const apy         = stats?.[4] ?? 0n;

  const estimatedInterest = amount && Number(amount) > 0
    ? (Number(amount) * Number(apy) / 10000) * (duration / (365 * 86400))
    : 0;

  const totalRepay = amount ? Number(amount) + estimatedInterest : 0;
  const fee        = amount ? Number(amount) * 0.005 : 0;
  const disbursed  = amount ? Number(amount) - fee : 0;

  // Need approval for repayment (we pre-approve max; bootstrap needs 10 USDC)
  const needsBootstrapApproval = score === 0n &&
    allowance < parseUnits("10", 18);

  const bootstrap  = useBootstrap();
  const approve    = useApprove();
  const requestLoan = useRequestLoan();
  const repayLoan  = useRepayLoan();
  const markDefault = useMarkDefault();

  const [repayingId, setRepayingId] = useState<bigint | null>(null);
  const isRepaying = repayLoan.isPending || repayLoan.isConfirming;

  useEffect(() => {
    if (
      bootstrap.isSuccess || requestLoan.isSuccess || repayLoan.isSuccess ||
      approve.isSuccess || markDefault.isSuccess
    ) {
      refetch();
      setAmount("");
      const msg =
        bootstrap.isSuccess    ? "Reputation bootstrapped! Score: 100" :
        requestLoan.isSuccess  ? "Loan created! Check your active loans." :
        repayLoan.isSuccess    ? "Loan repaid! Your score increased." :
        approve.isSuccess      ? "Approved — now bootstrap your reputation." :
        "Default marked.";
      setTxMsg(msg);
      setRepayingId(null);
      setTimeout(() => setTxMsg(null), 5000);
    }
  }, [bootstrap.isSuccess, requestLoan.isSuccess, repayLoan.isSuccess, approve.isSuccess, markDefault.isSuccess]);

  const handleRepay = (id: bigint) => {
    setRepayingId(id);
    repayLoan.repay(id);
  };

  const handleDefault = (id: bigint) => markDefault.markDefault(id);

  const canBorrow = score >= 100n;
  const activeLoanIds = loanIds; // show all, LoanRow handles display

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Borrow</h1>
        <p className="text-lapo-muted">Build your on-chain credit score and unlock USDC loans.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: reputation + stats */}
        <div className="space-y-4">
          {isConnected ? (
            <div className="bg-lapo-card border border-lapo-border rounded-2xl p-5 space-y-4">
              <ReputationBar score={score} size="lg" />
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-lapo-border">
                <div className="text-center">
                  <p className="text-xl font-bold text-green-400">{completed.toString()}</p>
                  <p className="text-xs text-lapo-muted">Repaid</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-red-400">{defaulted.toString()}</p>
                  <p className="text-xs text-lapo-muted">Defaults</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-lapo-card border border-lapo-border rounded-2xl p-5 text-center">
              <p className="text-sm text-lapo-muted">Connect wallet to see your reputation.</p>
            </div>
          )}

          <StatCard label="Max Borrow" value={`$${formatUSDC(maxBorrow)}`} accent />
          <StatCard label="Current APY" value={`${formatBps(apy)}%`} sub="Fixed at origination" cyan />

          {/* Credit tiers */}
          <div className="bg-lapo-card border border-lapo-border rounded-2xl p-5">
            <p className="text-xs font-medium text-lapo-muted uppercase tracking-wider mb-3">Credit Tiers</p>
            <div className="space-y-2 text-xs">
              {[
                { range: "0–99",    tier: "Unrated",  limit: "No access",    color: "#7090b0" },
                { range: "100–299", tier: "Starter",  limit: "Up to $1,000", color: "#0ae8f0" },
                { range: "300–599", tier: "Trusted",  limit: "Up to $5,000", color: "#006bff" },
                { range: "600–999", tier: "Verified", limit: "Up to $20,000",color: "#004796" },
                { range: "1000",    tier: "Prime",    limit: "Up to $50,000",color: "#0ae8f0" },
              ].map((t) => (
                <div key={t.tier} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    <span style={{ color: t.color }} className="font-semibold">{t.tier}</span>
                    <span className="text-lapo-muted">({t.range})</span>
                  </div>
                  <span className="text-lapo-muted">{t.limit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Bootstrap card */}
          {isConnected && score === 0n && (
            <div className="bg-lapo-card border border-lapo-cyan/30 rounded-2xl p-6 animate-fade-up">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-lapo-cyan/10 flex items-center justify-center flex-none">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v20M6 12h12" stroke="#0ae8f0" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">Bootstrap Your Reputation</h3>
                  <p className="text-sm text-lapo-muted mb-4">
                    Start with a proof-of-intent: 10 USDC is approved and immediately refunded.
                    You receive <span className="text-white font-medium">100 score points</span> — enough
                    to take a micro-loan and begin building your credit history.
                  </p>
                  {txMsg && (
                    <p className="text-sm text-green-400 mb-3">{txMsg}</p>
                  )}
                  {needsBootstrapApproval ? (
                    <TxButton
                      onClick={() => approve.approve(parseUnits("10", 18))}
                      loading={approve.isPending || approve.isConfirming}
                      loadingText="Approving…"
                    >
                      Approve 10 USDC
                    </TxButton>
                  ) : (
                    <TxButton
                      onClick={() => bootstrap.bootstrap()}
                      loading={bootstrap.isPending || bootstrap.isConfirming}
                      loadingText="Bootstrapping…"
                    >
                      Bootstrap Reputation (+100 score)
                    </TxButton>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Request loan */}
          {isConnected && canBorrow && (
            <div className="bg-lapo-card border border-lapo-border rounded-2xl overflow-hidden animate-fade-up">
              <div className="px-6 py-4 border-b border-lapo-border">
                <h2 className="font-semibold">Request a Loan</h2>
              </div>

              <div className="p-6 space-y-5">
                {/* Amount */}
                <div>
                  <label className="block text-xs font-medium text-lapo-muted mb-2">
                    Loan Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      max={formatUSDC(maxBorrow, 2).replace(/,/g, "")}
                      className="w-full bg-lapo-dark border border-lapo-border rounded-xl px-4 py-3.5 text-lg font-semibold text-white placeholder:text-lapo-muted/40 focus:outline-none focus:border-lapo-blue/60 transition-colors"
                    />
                    <button
                      onClick={() => setAmount(formatUSDC(maxBorrow, 2).replace(/,/g, ""))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-lapo-blue hover:text-lapo-cyan px-2 py-1 rounded-md hover:bg-lapo-blue/10 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                  <p className="text-xs text-lapo-muted mt-1.5">
                    Credit limit: ${formatUSDC(maxBorrow)}
                  </p>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-medium text-lapo-muted mb-2">Loan Duration</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setDuration(d.value)}
                        className={cn(
                          "py-3 rounded-xl text-sm font-semibold border transition-all",
                          duration === d.value
                            ? "bg-lapo-blue/15 border-lapo-blue text-lapo-blue"
                            : "bg-lapo-dark border-lapo-border text-lapo-muted hover:border-lapo-blue/40 hover:text-white"
                        )}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                {amount && Number(amount) > 0 && (
                  <div className="bg-lapo-dark/60 border border-lapo-border/60 rounded-xl p-4 space-y-2 text-sm animate-fade-up">
                    <div className="flex justify-between">
                      <span className="text-lapo-muted">Loan amount</span>
                      <span>${Number(amount).toLocaleString()} USDC</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lapo-muted">Origination fee (0.5%)</span>
                      <span className="text-red-400">−${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lapo-muted">You receive</span>
                      <span className="font-semibold text-white">${disbursed.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-lapo-border/60 pt-2 flex justify-between">
                      <span className="text-lapo-muted">Total to repay</span>
                      <span className="font-semibold text-lapo-cyan">${totalRepay.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lapo-muted">Fixed APY</span>
                      <span>{formatBps(apy)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-lapo-muted">Duration</span>
                      <span>{durationLabel(duration)}</span>
                    </div>
                  </div>
                )}

                {txMsg && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-fade-up">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12l5 5L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {txMsg}
                  </div>
                )}

                {requestLoan.error && (
                  <p className="text-xs text-red-400 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                    {requestLoan.error.message?.slice(0, 200)}
                  </p>
                )}

                <TxButton
                  onClick={() => requestLoan.requestLoan(amount, duration)}
                  disabled={!amount || Number(amount) <= 0 || Number(amount) > Number(formatUSDC(maxBorrow, 2).replace(/,/g, ""))}
                  loading={requestLoan.isPending || requestLoan.isConfirming}
                  loadingText="Requesting Loan…"
                >
                  Request Loan
                </TxButton>
              </div>
            </div>
          )}

          {/* Active loans */}
          {isConnected && activeLoanIds.length > 0 && (
            <div className="animate-fade-up">
              <h2 className="font-semibold mb-4">Your Loans</h2>
              <div className="space-y-3">
                {activeLoanIds.map((id) => (
                  <LoanRow
                    key={id.toString()}
                    loanId={id}
                    onRepay={handleRepay}
                    onDefault={handleDefault}
                    repaying={repayingId === id && isRepaying}
                  />
                ))}
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="bg-lapo-card border border-lapo-border rounded-2xl p-10 text-center">
              <p className="text-lapo-muted text-sm">Connect your wallet to access borrowing.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
