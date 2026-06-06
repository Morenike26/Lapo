"use client";

import { scoreLabel, scorePct } from "@/lib/utils";

interface ReputationBarProps {
  score: bigint;
  size?: "sm" | "lg";
}

export function ReputationBar({ score, size = "lg" }: ReputationBarProps) {
  const { tier, color } = scoreLabel(score);
  const pct = scorePct(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className={size === "lg" ? "text-sm font-medium text-lapo-muted" : "text-xs text-lapo-muted"}>
          Reputation
        </span>
        <div className="flex items-center gap-2">
          <span style={{ color }} className="text-xs font-semibold uppercase tracking-wider">
            {tier}
          </span>
          <span className={size === "lg" ? "text-xl font-bold text-white" : "text-base font-bold text-white"}>
            {score.toString()}
            <span className="text-lapo-muted font-normal text-xs">/1000</span>
          </span>
        </div>
      </div>

      <div className="h-2 bg-lapo-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #004796 0%, ${color} 100%)`,
          }}
        />
      </div>

      {size === "lg" && (
        <div className="flex justify-between text-xs text-lapo-muted/60">
          <span>Unrated</span>
          <span>Starter</span>
          <span>Trusted</span>
          <span>Verified</span>
          <span>Prime</span>
        </div>
      )}
    </div>
  );
}
