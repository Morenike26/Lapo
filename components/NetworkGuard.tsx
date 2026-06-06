"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/lib/chains";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();
  const wrongNetwork = isConnected && chain?.id !== arcTestnet.id;

  if (!wrongNetwork) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
      <div className="bg-lapo-card border border-lapo-border rounded-2xl p-8 max-w-sm w-full text-center animate-fade-up">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M21 12A9 9 0 1 1 3 12a9 9 0 0 1 18 0Z"
              stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold mb-2">Wrong Network</h2>
        <p className="text-sm text-lapo-muted mb-1">
          Lapo runs on <span className="text-lapo-cyan font-medium">Arc Testnet</span>.
          Your wallet is connected to{" "}
          <span className="text-white">{chain?.name ?? "an unknown network"}</span>.
        </p>
        <p className="text-xs text-lapo-muted mb-6">
          Required chain ID:{" "}
          <span className="text-white font-mono">{arcTestnet.id}</span>
        </p>
        <button
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          disabled={isPending}
          className="w-full py-3 rounded-xl bg-lapo-blue text-white font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {isPending ? "Switching…" : "Switch to Arc Testnet"}
        </button>
        {error && (
          <p className="mt-3 text-xs text-red-400">
            {error.message.includes("4902") || error.message.includes("Unrecognized")
              ? "Arc Testnet not in your wallet yet — click switch again to add it."
              : error.message.slice(0, 120)}
          </p>
        )}
      </div>
    </div>
  );
}
