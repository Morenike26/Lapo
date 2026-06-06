import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  cyan?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function StatCard({ label, value, sub, accent, cyan, className, style }: StatCardProps) {
  const color = accent ? "#006bff" : cyan ? "#0ae8f0" : "#ffffff";
  return (
    <div style={style} className={cn("group", className)}>
      <div
        className="h-px w-7 mb-3 transition-[width] duration-500 ease-out group-hover:w-12"
        style={{ background: color }}
      />
      <p
        className="text-[2.5rem] font-bold leading-none tracking-tight mb-2"
        style={{ color }}
      >
        {value}
      </p>
      <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em]">{label}</p>
      {sub && <p className="text-[11px] text-lapo-muted/50 mt-0.5">{sub}</p>}
    </div>
  );
}
