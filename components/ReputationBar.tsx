"use client";

import { scoreLabel } from "@/lib/utils";

interface ReputationBarProps {
  score: bigint;
  size?: "sm" | "lg";
}

const SEGMENTS = [
  { name: "Unrated",  min: 0,    max: 99,   color: "#3a5070", width: "flex-[100]" },
  { name: "Starter",  min: 100,  max: 299,  color: "#0ae8f0", width: "flex-[200]" },
  { name: "Trusted",  min: 300,  max: 599,  color: "#006bff", width: "flex-[300]" },
  { name: "Verified", min: 600,  max: 999,  color: "#004796", width: "flex-[400]" },
  { name: "Prime",    min: 1000, max: 1000, color: "#0ae8f0", width: "flex-[1]" },
];

export function ReputationBar({ score, size = "lg" }: ReputationBarProps) {
  const { tier, color } = scoreLabel(score);
  const s = Number(score);

  return (
    <div className="space-y-4">
      {/* Score + tier */}
      <div className="flex items-end gap-3">
        <span className="text-5xl font-bold text-white leading-none">{score.toString()}</span>
        <div className="mb-1 space-y-0.5">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] leading-none"
            style={{ color }}
          >
            {tier}
          </p>
          <p className="text-[10px] text-lapo-muted/50 leading-none">/ 1000</p>
        </div>
      </div>

      {/* Segmented track */}
      <div className="flex gap-1 items-end">
        {SEGMENTS.map((seg) => {
          const active = s >= seg.min;
          return (
            <div
              key={seg.name}
              className={`${seg.width} h-1 rounded-full transition-all duration-700`}
              style={{
                background: active ? seg.color : "#0d2040",
                opacity: active ? (seg.color === "#004796" ? 0.9 : 1) : 0.4,
                boxShadow: active && s >= seg.min ? `0 0 6px ${seg.color}60` : "none",
              }}
            />
          );
        })}
      </div>

      {size === "lg" && (
        <div className="flex justify-between text-[9px] text-lapo-muted/40 uppercase tracking-widest">
          {SEGMENTS.map((seg) => (
            <span key={seg.name}>{seg.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}
