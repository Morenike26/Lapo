import { cn } from "@/lib/utils";

interface UtilizationBarProps {
  utilization: bigint;
  className?: string;
}

export function UtilizationBar({ utilization, className }: UtilizationBarProps) {
  const pct = Math.min((Number(utilization) / 1e18) * 100, 100);
  const color =
    pct < 50 ? "#0ae8f0" :
    pct < 80 ? "#006bff" :
               "#f87171";

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-between text-xs">
        <span className="text-lapo-muted">Pool Utilization</span>
        <span className="font-semibold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-lapo-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
