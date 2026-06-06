"use client";

import Link from "next/link";
import { TrendingUp, Shield, ArrowRight } from "lucide-react";
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">

      {/* Hero — left-aligned, editorial */}
      <div className="mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lapo-blue/30 bg-lapo-blue/10 text-lapo-cyan text-xs font-medium mb-10">
          <span className="w-1.5 h-1.5 rounded-full bg-lapo-cyan animate-pulse" />
          Arc Testnet · Live
        </div>

        <div className="max-w-3xl">
          <h1 className="text-[4.5rem] sm:text-[6rem] font-bold tracking-tight leading-[0.88] mb-8">
            Credit that<br />
            lives{" "}
            <span className="gradient-text">on-chain.</span>
          </h1>
          <p className="text-lapo-muted text-xl leading-relaxed mb-10 max-w-lg">
            Lapo is a permissionless lending pool on Arc where lenders earn real yield
            and borrowers build a credit reputation that compounds over time.
            No KYC. No middlemen.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/lend"
              className="px-8 py-3.5 rounded-lg text-white font-semibold hover:brightness-110 active:scale-[0.98] transition-all"
              style={{ background: "linear-gradient(135deg, #004796, #006bff)" }}
            >
              Start Earning
            </Link>
            <Link
              href="/borrow"
              className="px-8 py-3.5 rounded-lg border border-lapo-border text-white font-semibold hover:border-lapo-blue/50 hover:bg-lapo-blue/5 active:scale-[0.98] transition-all"
            >
              Get a Loan
            </Link>
          </div>
        </div>
      </div>

      {/* Live stats — horizontal strip, no cards */}
      <div className="border-y border-lapo-border py-10 mb-16">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-20 rounded" style={{ animationDelay: `${i * 80}ms` }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:divide-x lg:divide-lapo-border">
            <StatCard
              label="Total Value Locked"
              value={`$${formatUSDC(tvl)}`}
              sub="USDC in the pool"
              accent
              className="lg:pr-8 animate-fade-up"
              style={{ animationDelay: "0ms" }}
            />
            <StatCard
              label="Total Borrowed"
              value={`$${formatUSDC(borrowed)}`}
              sub="Outstanding"
              className="lg:px-8 animate-fade-up"
              style={{ animationDelay: "60ms" }}
            />
            <StatCard
              label="Available"
              value={`$${formatUSDC(liquidity)}`}
              sub="Ready to lend"
              className="lg:px-8 animate-fade-up"
              style={{ animationDelay: "120ms" }}
            />
            <StatCard
              label="Lender APY"
              value={`${formatBps(apy)}%`}
              sub={`${formatUtilization(utilization)}% utilized`}
              cyan
              className="lg:pl-8 animate-fade-up"
              style={{ animationDelay: "180ms" }}
            />
          </div>
        )}
      </div>

      {/* How it works — numbered steps, no card boxes */}
      <div className="mb-16">
        <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.15em] mb-12">
          How it works
        </p>
        <div className="grid sm:grid-cols-2 gap-12 sm:gap-16">
          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <p className="text-[5rem] font-bold leading-none mb-5 select-none" style={{ color: "#0d2040" }}>01</p>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} color="#006bff" strokeWidth={1.8} />
              <h3 className="font-semibold text-lg">Put your USDC to work</h3>
            </div>
            <ul className="space-y-3 text-sm text-lapo-muted leading-relaxed">
              <li>Deposit USDC and receive LP shares that appreciate as borrowers repay interest</li>
              <li>90% of all interest flows directly to the pool. Lenders keep the lion's share.</li>
              <li>Withdraw any time liquidity is available. No lock-ups, no vesting.</li>
            </ul>
            <Link
              href="/lend"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors"
            >
              Go to Lend <ArrowRight size={14} />
            </Link>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "180ms" }}>
            <p className="text-[5rem] font-bold leading-none mb-5 select-none" style={{ color: "#0d2040" }}>02</p>
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} color="#0ae8f0" strokeWidth={1.8} />
              <h3 className="font-semibold text-lg">Build credit. Borrow more.</h3>
            </div>
            <ul className="space-y-3 text-sm text-lapo-muted leading-relaxed">
              <li>Put down a small proof of intent to get your first 100 reputation points</li>
              <li>Every loan you repay on time pushes your score higher and unlocks bigger credit lines</li>
              <li>Choose 30, 60 or 90 day terms with the rate locked at origination</li>
            </ul>
            <Link
              href="/borrow"
              className="inline-flex items-center gap-1.5 mt-6 text-sm font-semibold text-lapo-cyan hover:text-lapo-blue transition-colors"
            >
              Go to Borrow <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* Economics — borderless, typographic */}
      <div className="border-t border-lapo-border pt-10">
        <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.15em] mb-8">
          Economics
        </p>
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-0 sm:divide-x sm:divide-lapo-border">
          <div className="sm:pr-12">
            <p className="text-4xl font-bold text-lapo-blue">90%</p>
            <p className="text-sm text-lapo-muted mt-1">of interest goes to lenders</p>
          </div>
          <div className="sm:px-12">
            <p className="text-4xl font-bold text-lapo-cyan">0.5%</p>
            <p className="text-sm text-lapo-muted mt-1">origination fee per loan</p>
          </div>
          <div className="sm:pl-12">
            <p className="text-4xl font-bold text-white">10%</p>
            <p className="text-sm text-lapo-muted mt-1">protocol cut of interest</p>
          </div>
        </div>
      </div>
    </div>
  );
}
