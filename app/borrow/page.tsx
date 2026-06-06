"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { CheckCircle, Plus } from "lucide-react";
import {
  useBorrowerInfo,
  usePoolStats,
  useBootstrap,
  useApprove,
  useRequestLoan,
  useRepayLoan,
  useMarkDefault,
  useLoanDetails,
  useUSDCBalance,
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

  const status = loan.repaid ? "Repaid"
    : loan.defaulted ? "Defaulted"
    : isOverdue ? "Overdue"
    : "Active";

  const borderColor = {
    Repaid:    "#22c55e",
    Active:    "#0ae8f0",
    Overdue:   "#ef4444",
    Defaulted: "#ef4444",
  }[status];

  const statusColor = {
    Repaid:    "text-green-400",
    Active:    "text-lapo-cyan",
    Overdue:   "text-red-400",
    Defaulted: "text-red-400",
  }[status];

  const total = loan.principal + loan.interestDue;

  return (
    <div
      className="pl-4 py-4 space-y-3 border-b border-lapo-border/40 last:border-0"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-lapo-muted font-mono uppercase tracking-wider">
            Loan #{loanId.toString()}
          </p>
          <p className="text-xl font-bold">${formatUSDC(loan.principal)} USDC</p>
        </div>
        <span className={cn("text-[10px] font-semibold uppercase tracking-widest", statusColor)}>
          {status}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-lapo-muted mb-0.5">Principal</p>
          <p className="font-semibold">${formatUSDC(loan.principal)}</p>
        </div>
        <div>
          <p className="text-lapo-muted mb-0.5">Interest</p>
          <p className="font-semibold">${formatUSDC(loan.interestDue)}</p>
        </div>
        <div>
          <p className="text-lapo-muted mb-0.5">Due</p>
          <p className="font-semibold">{timeLeft(loan.dueDate)}</p>
        </div>
      </div>

      {!loan.repaid && !loan.defaulted && (
        <div className="flex gap-2 pt-1">
          <TxButton onClick={() => onRepay(loanId)} loading={repaying} loadingText="Repaying…" className="flex-1">
            Repay ${formatUSDC(total)}
          </TxButton>
          {isOverdue && (
            <TxButton
              onClick={() => onDefault(loanId)}
              loading={false}
              variant="danger"
              className="flex-none px-4 !w-auto"
            >
              Default
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
  const { data: nativeBal } = useUSDCBalance(address);

  const [amount, setAmount]     = useState("");
  const [duration, setDuration] = useState(DURATIONS[0].value);
  const [txMsg, setTxMsg]       = useState<string | null>(null);

  const score     = (borrowerData?.[0]?.result as bigint | undefined) ?? 0n;
  const completed = (borrowerData?.[1]?.result as bigint | undefined) ?? 0n;
  const defaulted = (borrowerData?.[2]?.result as bigint | undefined) ?? 0n;
  const maxBorrow = (borrowerData?.[3]?.result as bigint | undefined) ?? 0n;
  const loanIds   = (borrowerData?.[4]?.result as bigint[] | undefined) ?? [];
  // ERC20 balanceOf returns 6-decimal amounts matching the contract
  const usdcBal   = (borrowerData?.[5]?.result as bigint | undefined) ?? nativeBal?.value ?? 0n;
  const allowance = (borrowerData?.[6]?.result as bigint | undefined) ?? 0n;

  const apy = stats?.[4] ?? 0n;

  const estimatedInterest = amount && Number(amount) > 0
    ? (Number(amount) * Number(apy) / 10000) * (duration / (365 * 86400))
    : 0;
  const totalRepay = amount ? Number(amount) + estimatedInterest : 0;
  const fee        = amount ? Number(amount) * 0.005 : 0;
  const disbursed  = amount ? Number(amount) - fee : 0;

  const BOOTSTRAP_AMOUNT = parseUnits("10", 6);
  const insufficientForBootstrap = usdcBal < BOOTSTRAP_AMOUNT;
  const needsBootstrapApproval = score === 0n && allowance < BOOTSTRAP_AMOUNT;

  const bootstrap   = useBootstrap();
  const approve     = useApprove();
  const requestLoan = useRequestLoan();
  const repayLoan   = useRepayLoan();
  const markDefault = useMarkDefault();

  const [repayingId, setRepayingId] = useState<bigint | null>(null);
  const isRepaying = repayLoan.isPending || repayLoan.isConfirming;

  useEffect(() => {
    if (bootstrap.isSuccess || requestLoan.isSuccess || repayLoan.isSuccess ||
        approve.isSuccess || markDefault.isSuccess) {
      refetch();
      setAmount("");
      const msg =
        bootstrap.isSuccess   ? "Reputation bootstrapped. Starting score: 100." :
        requestLoan.isSuccess ? "Loan created. Check your active loans below." :
        repayLoan.isSuccess   ? "Loan repaid. Your score went up." :
        approve.isSuccess     ? "Approved. Ready to bootstrap your reputation." :
        "Default recorded.";
      setTxMsg(msg);
      setRepayingId(null);
      setTimeout(() => setTxMsg(null), 5000);
    }
  }, [bootstrap.isSuccess, requestLoan.isSuccess, repayLoan.isSuccess, approve.isSuccess, markDefault.isSuccess]);

  const handleRepay   = (id: bigint) => { setRepayingId(id); repayLoan.repay(id); };
  const handleDefault = (id: bigint) => markDefault.markDefault(id);
  const canBorrow = score >= 100n;

  const parsedLoanAmount = amount ? parseUnits(amount, 6) : 0n;
  const loanExceedsLimit = parsedLoanAmount > maxBorrow;
  // Pool must have liquidity to issue a loan; the pool contract enforces this,
  // but we also check balance isn't needed since borrowers receive USDC not spend it.

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Borrow</h1>
        <p className="text-lapo-muted">
          Your credit score lives on-chain. Grow it by repaying loans and unlock bigger credit lines.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* Left: score + tiers */}
        <div className="lg:col-span-2 space-y-8">
          {isConnected ? (
            <div>
              <ReputationBar score={score} size="lg" />
              <div className="flex gap-8 mt-6 pt-6 border-t border-lapo-border">
                <div>
                  <p className="text-2xl font-bold text-green-400">{completed.toString()}</p>
                  <p className="text-[11px] text-lapo-muted mt-0.5 uppercase tracking-widest">Repaid</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-400">{defaulted.toString()}</p>
                  <p className="text-[11px] text-lapo-muted mt-0.5 uppercase tracking-widest">Defaults</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-lapo-muted">Connect your wallet to see your reputation.</p>
          )}

          <div className="flex gap-8 pt-2">
            <StatCard label="Credit limit" value={`$${formatUSDC(maxBorrow)}`} accent />
            <StatCard label="APY today"    value={`${formatBps(apy)}%`}         cyan />
          </div>

          {/* Credit tiers */}
          <div className="border-t border-lapo-border pt-6">
            <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
              Credit tiers
            </p>
            <div className="space-y-0">
              {[
                { range: "0–99",    tier: "Unrated",  limit: "No access",  color: "#7090b0" },
                { range: "100–299", tier: "Starter",  limit: "$1,000",     color: "#0ae8f0" },
                { range: "300–599", tier: "Trusted",  limit: "$5,000",     color: "#006bff" },
                { range: "600–999", tier: "Verified", limit: "$20,000",    color: "#004796" },
                { range: "1000",    tier: "Prime",    limit: "$50,000",    color: "#0ae8f0" },
              ].map((t) => (
                <div
                  key={t.tier}
                  className="flex items-center justify-between py-2.5 border-b border-lapo-border/30 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="text-sm font-medium" style={{ color: t.color }}>{t.tier}</span>
                    <span className="text-[11px] text-lapo-muted/50">({t.range})</span>
                  </div>
                  <span className="text-sm text-lapo-muted">{t.limit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        <div className="lg:col-span-3 space-y-10">
          {/* Bootstrap */}
          {isConnected && score === 0n && (
            <div className="pl-4 animate-fade-up" style={{ borderLeft: "2px solid #0ae8f0" }}>
              <div className="flex items-center gap-2 mb-3">
                <Plus size={15} color="#0ae8f0" />
                <h3 className="font-semibold">Start your credit history</h3>
              </div>
              <p className="text-sm text-lapo-muted mb-5 leading-relaxed">
                Commit 10 USDC as proof of intent. The funds come straight back and your wallet
                receives <span className="text-white">100 score points</span>, enough to take
                your first loan.
              </p>
              {insufficientForBootstrap && (
                <p className="text-xs text-red-400 mb-4">
                  You need at least 10 USDC to bootstrap. Your balance: ${formatUSDC(usdcBal)}.
                </p>
              )}
              {txMsg && (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                  <CheckCircle size={14} /> {txMsg}
                </div>
              )}
              {needsBootstrapApproval ? (
                <TxButton
                  onClick={() => approve.approve(BOOTSTRAP_AMOUNT)}
                  loading={approve.isPending || approve.isConfirming}
                  loadingText="Approving…"
                  disabled={insufficientForBootstrap}
                >
                  Approve 10 USDC
                </TxButton>
              ) : (
                <TxButton
                  onClick={() => bootstrap.bootstrap()}
                  loading={bootstrap.isPending || bootstrap.isConfirming}
                  loadingText="Bootstrapping…"
                  disabled={insufficientForBootstrap}
                >
                  Bootstrap Reputation (+100 score)
                </TxButton>
              )}
            </div>
          )}

          {/* Request loan */}
          {isConnected && canBorrow && (
            <div className="animate-fade-up">
              <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-6">
                Request a loan
              </p>

              {/* Underline-style amount input */}
              <div className="border-b border-lapo-border focus-within:border-lapo-blue pb-3 mb-8 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-lapo-muted uppercase tracking-[0.14em]">Amount</span>
                  <button
                    onClick={() => setAmount(formatUSDC(maxBorrow, 2).replace(/,/g, ""))}
                    className="text-xs font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors"
                  >
                    MAX &nbsp;
                    <span className="text-lapo-muted font-normal">${formatUSDC(maxBorrow)}</span>
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    max={formatUSDC(maxBorrow, 2).replace(/,/g, "")}
                    className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-lapo-muted/20 focus:outline-none"
                  />
                  <span className="text-lapo-muted font-medium pb-1">USDC</span>
                </div>
              </div>

              {/* Term selector — underline tabs */}
              <div className="mb-8">
                <p className="text-[11px] text-lapo-muted uppercase tracking-[0.14em] mb-3">Loan term</p>
                <div className="flex gap-0 border-b border-lapo-border/40">
                  {DURATIONS.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setDuration(d.value)}
                      className={cn(
                        "flex-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-all",
                        duration === d.value
                          ? "text-white border-lapo-blue"
                          : "text-lapo-muted border-transparent hover:text-white/60"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {amount && Number(amount) > 0 && (
                <div className="space-y-3 text-sm mb-8 animate-fade-up">
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">Origination fee (0.5%)</span>
                    <span className="text-red-400">−${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">You receive</span>
                    <span className="font-semibold">${disbursed.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">Total to repay</span>
                    <span className="font-semibold text-lapo-cyan">${totalRepay.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lapo-muted">Fixed APY · {durationLabel(duration)}</span>
                    <span>{formatBps(apy)}%</span>
                  </div>
                </div>
              )}

              {txMsg && (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-4 animate-fade-up">
                  <CheckCircle size={16} /> {txMsg}
                </div>
              )}

              {requestLoan.error && (
                <p className="text-xs text-red-400 mb-4">
                  {requestLoan.error.message?.slice(0, 160)}
                </p>
              )}

              <TxButton
                onClick={() => requestLoan.requestLoan(amount, duration)}
                disabled={
                  !amount ||
                  Number(amount) <= 0 ||
                  loanExceedsLimit
                }
                loading={requestLoan.isPending || requestLoan.isConfirming}
                loadingText="Requesting Loan…"
              >
                Request Loan
              </TxButton>
            </div>
          )}

          {/* Loan list */}
          {isConnected && loanIds.length > 0 && (
            <div className="animate-fade-up">
              <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
                Your loans
              </p>
              <div>
                {loanIds.map((id) => (
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
            <p className="text-sm text-lapo-muted">Connect your wallet to access borrowing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
