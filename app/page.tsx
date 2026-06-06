"use client";

import Link from "next/link";
import { usePoolStats } from "@/hooks/useLapo";
import { StatCard } from "@/components/StatCard";
import { formatUSDC, formatBps, formatUtilization } from "@/lib/utils";

export default function DashboardPage() {
  const { data: stats, isLoading } = usePoolStats();

  const tvl         = stats?.[0] ?? 0n;
  const borrowed    = stats?.[1] ?? 0n;
  const liquidity   = stats?.[2] ?? 0n;
  const utilization = stats?.[3] ?? 0n;
  const apy         = stats?.[4] ?? 0n;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="relative mb-16 text-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className="w-[700px] h-[400px] rounded-full opacity-20 blur-3xl"
            style={{
              background:
                "radial-gradient(ellipse, #006bff 0%, #004796 40%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lapo-blue/30 bg-lapo-blue/10 text-lapo-cyan text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lapo-cyan animate-pulse" />
            Arc Testnet · Live
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-5">
            <span className="text-white">Permissionless </span>
            <span className="gradient-text">Lending</span>
            <br />
            <span className="text-white">on Arc</span>
          </h1>

          <p className="text-lapo-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Deposit USDC to earn yield. Build your on-chain credit score and unlock
            USDC loans — no KYC, no middlemen, no gatekeepers.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/lend"
              className="px-8 py-3.5 rounded-xl bg-lapo-blue text-white font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
            >
              Start Earning
            </Link>
            <Link
              href="/borrow"
              className="px-8 py-3.5 rounded-xl bg-lapo-card border border-lapo-border text-white font-semibold hover:border-lapo-blue/50 hover:bg-lapo-blue/5 active:scale-[0.98] transition-all"
            >
              Get a Loan
            </Link>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" style={{ animationDelay: `${i * 80}ms` }} />
          ))
        ) : (
          <>
            <StatCard
              label="Total Value Locked"
              value={`$${formatUSDC(tvl)}`}
              sub="USDC deposited"
              accent
              className="animate-fade-up"
              style={{ animationDelay: "0ms" }}
            />
            <StatCard
              label="Total Borrowed"
              value={`$${formatUSDC(borrowed)}`}
              sub="Outstanding loans"
              className="animate-fade-up"
              style={{ animationDelay: "60ms" }}
            />
            <StatCard
              label="Available Liquidity"
              value={`$${formatUSDC(liquidity)}`}
              sub="Ready to deploy"
              className="animate-fade-up"
              style={{ animationDelay: "120ms" }}
            />
            <StatCard
              label="Current Lender APY"
              value={`${formatBps(apy)}%`}
              sub={`${formatUtilization(utilization)}% utilization`}
              cyan
              className="animate-fade-up"
              style={{ animationDelay: "180ms" }}
            />
          </>
        )}
      </div>

      {/* How it works */}
      <div className="grid sm:grid-cols-2 gap-8 mb-12">
        <div className="bg-lapo-card border border-lapo-border rounded-2xl p-6 hover:border-lapo-blue/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-lapo-blue/15 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2v20M2 12h20M6 7l6-5 6 5" stroke="#006bff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">For Lenders</h3>
          <ul className="space-y-2 text-sm text-lapo-muted">
            <li className="flex items-start gap-2">
              <span className="text-lapo-cyan mt-0.5">→</span>
              Deposit USDC and receive LP shares representing your pool stake
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lapo-cyan mt-0.5">→</span>
              Earn 90% of all interest generated by the pool
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lapo-cyan mt-0.5">→</span>
              Withdraw any time — subject to available liquidity
            </li>
          </ul>
          <Link href="/lend" className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-lapo-blue hover:text-lapo-cyan transition-colors">
            Go to Lend
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="bg-lapo-card border border-lapo-border rounded-2xl p-6 hover:border-lapo-cyan/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-lapo-cyan/10 flex items-center justify-center mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 12a9 9 0 1 0 18 0A9 9 0 0 0 3 12Zm9 4V8m-4 4h8" stroke="#0ae8f0" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-semibold text-lg mb-2">For Borrowers</h3>
          <ul className="space-y-2 text-sm text-lapo-muted">
            <li className="flex items-start gap-2">
              <span className="text-lapo-blue mt-0.5">→</span>
              Bootstrap your on-chain reputation with a small proof-of-intent
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lapo-blue mt-0.5">→</span>
              Repay loans on time to build your score and unlock larger credit lines
            </li>
            <li className="flex items-start gap-2">
              <span className="text-lapo-blue mt-0.5">→</span>
              30, 60, or 90 day loan terms — fixed-rate at origination
            </li>
          </ul>
          <Link href="/borrow" className="inline-flex items-center gap-1 mt-5 text-sm font-medium text-lapo-cyan hover:text-lapo-blue transition-colors">
            Go to Borrow
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Fee structure */}
      <div className="bg-lapo-card border border-lapo-border rounded-2xl p-6">
        <h3 className="font-semibold text-sm text-lapo-muted uppercase tracking-wider mb-4">Protocol Fee Structure</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-lapo-blue">0.5%</p>
            <p className="text-xs text-lapo-muted mt-1">Origination fee</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-lapo-cyan">10%</p>
            <p className="text-xs text-lapo-muted mt-1">Protocol interest cut</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">90%</p>
            <p className="text-xs text-lapo-muted mt-1">Goes to lenders</p>
          </div>
        </div>
      </div>
    </div>
  );
}
