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
  return (
    <div
      style={style}
      className={cn(
        "relative bg-lapo-card border border-lapo-border rounded-2xl p-5 overflow-hidden",
        "transition-all duration-200 hover:border-lapo-blue/30",
        className
      )}
    >
      {/* Subtle glow accent */}
      {accent && (
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-lapo-blue/10 rounded-full blur-2xl pointer-events-none" />
      )}
      {cyan && (
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-lapo-cyan/10 rounded-full blur-2xl pointer-events-none" />
      )}

      <p className="text-xs font-medium text-lapo-muted uppercase tracking-wider mb-1">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold",
          accent ? "text-lapo-blue" : cyan ? "text-lapo-cyan" : "text-white"
        )}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-lapo-muted mt-1">{sub}</p>}
    </div>
  );
}
