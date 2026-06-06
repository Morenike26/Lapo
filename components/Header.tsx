"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./ConnectWallet";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/",       label: "Dashboard" },
  { href: "/lend",   label: "Lend" },
  { href: "/borrow", label: "Borrow" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-lapo-border bg-lapo-dark/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-lg bg-lapo-blue/20 group-hover:bg-lapo-blue/30 transition-colors" />
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="relative">
              <rect width="32" height="32" rx="8" fill="#006bff" fillOpacity="0.15" />
              <path d="M9 16h4l3-7 4 14 3-7h4" stroke="#006bff" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="23" cy="16" r="1.5" fill="#0ae8f0" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="text-white">Lapo</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-lapo-blue/15 text-lapo-blue"
                    : "text-lapo-muted hover:text-white hover:bg-white/5"
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <ConnectWallet />
      </div>

      {/* Mobile nav */}
      <nav className="sm:hidden flex border-t border-lapo-border">
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 py-2.5 text-center text-xs font-medium transition-colors",
                active ? "text-lapo-blue" : "text-lapo-muted"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
