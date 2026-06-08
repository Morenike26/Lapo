"use client";

import { useEffect } from "react";
import { WagmiProvider, useWalletClient } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiConfig } from "@/lib/wagmi";
import { NetworkGuard } from "@/components/NetworkGuard";

const queryClient = new QueryClient();

// Ensures MetaMask uses the correct Arc Testnet RPC.
// MetaMask stores its own RPC per chain ID; if the user added Arc Testnet
// with a different RPC, all eth_estimateGas calls fail. wallet_addEthereumChain
// updates the stored config silently when the RPC already matches, or prompts
// the user to approve it when it differs.
function RpcEnforcer() {
  const { data: walletClient } = useWalletClient();
  useEffect(() => {
    if (!walletClient) return;
    walletClient.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: "0x4CEF52",
        chainName: "Arc Testnet",
        nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 18 },
        rpcUrls: ["https://rpc.testnet.arc.network"],
        blockExplorerUrls: ["https://testnet.arcscan.app"],
      }],
    }).catch(() => {});
  }, [walletClient]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RpcEnforcer />
        <NetworkGuard>{children}</NetworkGuard>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
