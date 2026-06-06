"use client";

import Link from "next/link";
import { TrendingUp, Shield, ArrowRight, CheckCircle } from "lucide-react";
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
            <span className="text-white">Credit that lives </span>
            <span className="gradient-text">on-chain.</span>
            <br />
            <span className="text-white">Yours to own.</span>
          </h1>

          <p className="text-lapo-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Lapo is a permissionless lending pool where lenders earn real yield
            and borrowers build a credit reputation that follows them across the chain.
            No KYC. No middlemen. No gatekeepers.
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
              sub="USDC in the pool"
              accent
              className="animate-fade-up"
              style={{ animationDelay: "0ms" }}
            />
            <StatCard
              label="Total Borrowed"
              value={`$${formatUSDC(borrowed)}`}
              sub="Outstanding"
              className="animate-fade-up"
              style={{ animationDelay: "60ms" }}
            />
            <StatCard
              label="Available"
              value={`$${formatUSDC(liquidity)}`}
              sub="Ready to lend"
              className="animate-fade-up"
              style={{ animationDelay: "120ms" }}
            />
            <StatCard
              label="Lender APY"
              value={`${formatBps(apy)}%`}
              sub={`${formatUtilization(utilization)}% utilized`}
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
            <TrendingUp size={20} color="#006bff" strokeWidth={1.8} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Put your USDC to work</h3>
          <ul className="space-y-2 text-sm text-lapo-muted">
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-cyan" />
              Deposit USDC and receive LP shares that grow as borrowers repay interest
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-cyan" />
              90% of all interest flows directly to the pool. Lenders keep the lion's share
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-cyan" />
              Withdraw whenever liquidity is available. No lock-ups, no vesting
            </li>
          </ul>
          <Link href="/lend" className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-lapo-blue hover:text-lapo-cyan transition-colors">
            Go to Lend
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="bg-lapo-card border border-lapo-border rounded-2xl p-6 hover:border-lapo-cyan/30 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-lapo-cyan/10 flex items-center justify-center mb-4">
            <Shield size={20} color="#0ae8f0" strokeWidth={1.8} />
          </div>
          <h3 className="font-semibold text-lg mb-2">Build credit. Borrow more.</h3>
          <ul className="space-y-2 text-sm text-lapo-muted">
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-blue" />
              Put down a small proof of intent to get your first 100 reputation points
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-blue" />
              Every loan you repay on time pushes your score higher and unlocks bigger credit lines
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle size={14} className="mt-0.5 shrink-0 text-lapo-blue" />
              Choose 30, 60 or 90 day terms with the rate fixed at origination
            </li>
          </ul>
          <Link href="/borrow" className="inline-flex items-center gap-1.5 mt-5 text-sm font-medium text-lapo-cyan hover:text-lapo-blue transition-colors">
            Go to Borrow
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Fee structure */}
      <div className="bg-lapo-card border border-lapo-border rounded-2xl p-6">
        <h3 className="font-semibold text-sm text-lapo-muted uppercase tracking-wider mb-4">How the protocol earns</h3>
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-2xl font-bold text-lapo-blue">90%</p>
            <p className="text-xs text-lapo-muted mt-1">Of all interest goes to lenders</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-lapo-cyan">0.5%</p>
            <p className="text-xs text-lapo-muted mt-1">Origination fee on each loan</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">10%</p>
            <p className="text-xs text-lapo-muted mt-1">Protocol cut of interest earned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
