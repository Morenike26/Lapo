"use client";

import { useAccount } from "wagmi";
import { CheckCircle, Droplets } from "lucide-react";
import { useFaucetStatus, useFaucetClaim, useBorrowerInfo, useTokenPrices } from "@/hooks/useLapo";
import { TxButton } from "@/components/TxButton";
import { formatUSDC, cn } from "@/lib/utils";
import { useEffect } from "react";

const TOKENS = [
  { symbol: "mwETH", name: "Mocked Wrapped Ether",   icon: "⟠", color: "#627EEA" },
  { symbol: "mwBTC", name: "Mocked Wrapped Bitcoin",  icon: "₿",  color: "#F7931A" },
  { symbol: "mwSOL", name: "Mocked Wrapped Solana",   icon: "◎",  color: "#9945FF" },
];

function priceNum(raw: bigint | undefined) {
  if (!raw) return "—";
  return (Number(raw) / 1e6).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function tokenBal(raw: bigint | undefined) {
  if (!raw) return "0.0000";
  return (Number(raw) / 1e18).toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

export default function FaucetPage() {
  const { address, isConnected } = useAccount();

  const { data: claimed, refetch: refetchClaimed } = useFaucetStatus(address);
  const { data: borrowerData, refetch: refetchBal }  = useBorrowerInfo(address);
  const { data: prices } = useTokenPrices();
  const claimHook = useFaucetClaim();

  const ethBal  = borrowerData?.[0]?.result as bigint | undefined;
  const btcBal  = borrowerData?.[1]?.result as bigint | undefined;
  const solBal  = borrowerData?.[2]?.result as bigint | undefined;
  const balances = [ethBal, btcBal, solBal];

  const ethPrice = prices?.[0]?.result as bigint | undefined;
  const btcPrice = prices?.[1]?.result as bigint | undefined;
  const solPrice = prices?.[2]?.result as bigint | undefined;
  const priceList = [ethPrice, btcPrice, solPrice];

  useEffect(() => {
    if (claimHook.isSuccess) {
      refetchClaimed();
      refetchBal();
    }
  }, [claimHook.isSuccess]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Testnet Faucet</h1>
        <p className="text-lapo-muted">
          Claim 5 of each mock collateral token to start borrowing USDC on Arc Testnet.
          One claim per address.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">
        {/* Token cards */}
        <div className="lg:col-span-3 space-y-4 animate-fade-up">
          {TOKENS.map((token, i) => (
            <div
              key={token.symbol}
              className="flex items-center justify-between py-5 px-5 border border-lapo-border/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                  style={{ background: `${token.color}22`, color: token.color }}
                >
                  {token.icon}
                </div>
                <div>
                  <p className="font-semibold">{token.symbol}</p>
                  <p className="text-xs text-lapo-muted">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold">
                  {isConnected ? tokenBal(balances[i]) : "—"}
                  <span className="text-lapo-muted font-normal ml-1">{token.symbol}</span>
                </p>
                <p className="text-xs text-lapo-muted">
                  ${priceNum(priceList[i])} / token
                </p>
              </div>
            </div>
          ))}

          {/* Claim totals */}
          {isConnected && !claimed && (
            <div className="mt-2 pl-4 py-3 border-l-2 border-lapo-blue/40 text-sm text-lapo-muted">
              You will receive 5 of each token in a single transaction.
            </div>
          )}
        </div>

        {/* Right: claim panel */}
        <div className="lg:col-span-2 animate-fade-up">
          <div className="border border-lapo-border/50 rounded-lg p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Droplets size={16} color="#0ae8f0" />
              <p className="font-semibold">Claim Tokens</p>
            </div>

            {!isConnected ? (
              <p className="text-sm text-lapo-muted">Connect your wallet to claim.</p>
            ) : claimed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle size={14} /> Already claimed
                </div>
                <p className="text-xs text-lapo-muted leading-relaxed">
                  You already claimed your testnet tokens. Go to the Borrow page to put them to work.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-sm">
                  {TOKENS.map((t, i) => (
                    <div key={t.symbol} className="flex justify-between text-lapo-muted">
                      <span>5 {t.symbol}</span>
                      <span className="text-white">
                        ≈ ${priceList[i] ? (5 * Number(priceList[i]) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 0 }) : "—"} USDC
                      </span>
                    </div>
                  ))}
                </div>

                {claimHook.isSuccess && (
                  <div className="flex items-center gap-2 text-green-400 text-sm">
                    <CheckCircle size={14} /> Claimed. Check your balances above.
                  </div>
                )}

                {claimHook.error && (
                  <p className="text-xs text-red-400">{claimHook.error.message?.slice(0, 120)}</p>
                )}

                <TxButton
                  onClick={() => claimHook.claim()}
                  loading={claimHook.isPending || claimHook.isConfirming}
                  loadingText="Claiming…"
                >
                  Claim All Tokens
                </TxButton>
              </div>
            )}

            <div className="border-t border-lapo-border pt-4 space-y-2 text-xs text-lapo-muted">
              <p className="font-medium text-white text-[11px] uppercase tracking-widest">How it works</p>
              <p>The prices come from CoinGecko and are tracked on-chain. When the market moves, so does your collateral value.</p>
              <p>Use them on the Borrow page to take out a USDC loan. You need at least 135% collateral to open a position.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
