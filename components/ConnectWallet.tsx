"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/utils";
import { arcTestnet } from "@/lib/chains";

export function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const wrongNetwork = isConnected && chain?.id !== arcTestnet.id;

  if (isConnected && address) {
    if (wrongNetwork) {
      return (
        <button
          onClick={() => switchChain({ chainId: arcTestnet.id })}
          disabled={isSwitching}
          className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-colors disabled:opacity-60"
        >
          {isSwitching ? "Switching…" : "Wrong network"}
        </button>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-lapo-muted font-mono">
          {shortAddress(address)}
        </span>
        <button
          onClick={() => disconnect()}
          className="text-sm px-3 py-1.5 rounded-lg border border-lapo-border text-lapo-muted hover:text-white hover:border-white/20 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending}
      className="px-5 py-2.5 rounded-xl bg-lapo-blue text-white text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      {isPending ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}
