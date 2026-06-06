"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWallet } from "./ConnectWallet";
import { LapoLogo } from "./LapoLogo";
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
        <Link href="/" className="flex items-center">
          <LapoLogo size={32} />
        </Link>

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
