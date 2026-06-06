"use client";

import { cn } from "@/lib/utils";

interface TxButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}

export function TxButton({
  onClick,
  disabled,
  loading,
  loadingText = "Confirming…",
  children,
  variant = "primary",
  className,
}: TxButtonProps) {
  const base =
    "relative w-full h-12 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, className)}
      style={
        variant === "primary"
          ? { background: "linear-gradient(135deg, #004796 0%, #006bff 100%)", color: "#fff" }
          : variant === "danger"
          ? undefined
          : undefined
      }
    >
      {variant === "danger" && (
        <span className="absolute inset-0 rounded-lg border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 transition-colors" />
      )}
      {variant === "secondary" && (
        <span className="absolute inset-0 rounded-lg border border-lapo-border hover:border-lapo-blue/50 transition-colors" />
      )}

      <span
        className={cn(
          "relative flex items-center gap-2",
          variant === "danger" && "text-red-400",
          variant === "secondary" && "text-white"
        )}
      >
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {loadingText}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
