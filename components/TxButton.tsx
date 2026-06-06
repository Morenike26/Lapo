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
    "relative w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:   "bg-lapo-blue text-white hover:brightness-110",
    secondary: "bg-lapo-card border border-lapo-border text-white hover:border-lapo-blue/50",
    danger:    "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(base, variants[variant], className)}
    >
      {loading ? (
        <>
          <svg
            className="animate-spin w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
