"use client";

import { useState, useEffect, useRef } from "react";
import { useAccount, useReadContract } from "wagmi";
import { CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import {
  useBorrowerInfo,
  usePoolStats,
  useTokenPrices,
  useApproveCollateral,
  useApproveUSDC,
  useOpenPosition,
  useClosePosition,
  useLiquidate,
  usePositionDetails,
} from "@/hooks/useLapo";
import { USDC_ADDRESS, ERC20_ABI } from "@/lib/contracts";
import { TxButton } from "@/components/TxButton";
import { StatCard } from "@/components/StatCard";
import { formatUSDC, formatBps, cn } from "@/lib/utils";
import { MWETH_ADDRESS, MWBTC_ADDRESS, MWSOL_ADDRESS, LAPO_ADDRESS } from "@/lib/contracts";
import { parseUnits, formatUnits } from "viem";
import Link from "next/link";

// ── Collateral token registry ────────────────────────────────────────────────

const COLLATERAL_TOKENS = [
  { address: MWETH_ADDRESS, symbol: "mwETH", icon: "⟠", color: "#627EEA", decimals: 18, priceIdx: 0 },
  { address: MWBTC_ADDRESS, symbol: "mwBTC", icon: "₿",  color: "#F7931A", decimals: 18, priceIdx: 1 },
  { address: MWSOL_ADDRESS, symbol: "mwSOL", icon: "◎",  color: "#9945FF", decimals: 18, priceIdx: 2 },
] as const;

type CollToken = typeof COLLATERAL_TOKENS[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function healthColor(hf: number) {
  if (hf <= 0)   return "#7090b0";
  if (hf < 115)  return "#ef4444";
  if (hf < 130)  return "#f59e0b";
  return "#22c55e";
}

function healthLabel(hf: number) {
  if (hf <= 0)  return "Closed";
  if (hf < 115) return "At Risk";
  if (hf < 130) return "Caution";
  return "Healthy";
}

function tokenPrice(raw: bigint | undefined) {
  return raw ? Number(raw) / 1e6 : 0;
}

// ── Position row ─────────────────────────────────────────────────────────────

function PositionRow({
  positionId,
  onSuccess,
}: {
  positionId: bigint;
  onSuccess: () => void;
}) {
  const { address } = useAccount();
  const { data, refetch: refetchDetails } = usePositionDetails(positionId);

  const pos      = data?.[0]?.result as any;
  const hf       = Number(data?.[1]?.result ?? 0n);
  const liqPrice = data?.[2]?.result as bigint | undefined;
  const interest = data?.[3]?.result as bigint | undefined;

  // USDC allowance to Lapo (needed for close and liquidate)
  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: [address!, LAPO_ADDRESS],
    query: { enabled: !!address, refetchInterval: 5_000 },
  });
  const allowance = (allowanceRaw as bigint | undefined) ?? 0n;

  const approveUSDC = useApproveUSDC();
  const closePos    = useClosePosition();
  const liquidate   = useLiquidate();

  // Track which action is pending so we know what to do after approval
  const pendingAction = useRef<"close" | "liquidate" | null>(null);

  if (!pos || pos.borrower === "0x0000000000000000000000000000000000000000") return null;
  if (pos.closed || pos.liquidated) return null;

  const token  = COLLATERAL_TOKENS.find(t => t.address.toLowerCase() === pos.collateralToken.toLowerCase());
  const total  = pos.borrowedUSDC + (interest ?? 0n);
  const liqP   = liqPrice ? tokenPrice(liqPrice) : 0;
  const color  = healthColor(hf);

  // Liquidation: liquidator pays totalDebt + 50% of the spread (protocol share)
  // Approximate spread from health factor: colValue ≈ hf * totalDebt / 100
  const spread       = hf > 100 ? (BigInt(hf - 100) * total) / 100n : 0n;
  const liqFee       = spread / 2n;  // 50% of spread
  const totalToRepay = total + liqFee;

  const closeNeedsApproval    = allowance < total;
  const liquidateNeedsApproval = allowance < totalToRepay;

  // After USDC approval confirmed, trigger the queued action
  useEffect(() => {
    if (!approveUSDC.isSuccess) return;
    refetchAllowance();
    if (pendingAction.current === "close") {
      pendingAction.current = null;
      closePos.closePosition(positionId);
    } else if (pendingAction.current === "liquidate") {
      pendingAction.current = null;
      liquidate.liquidate(positionId);
    }
  }, [approveUSDC.isSuccess]);

  useEffect(() => {
    if (closePos.isSuccess || liquidate.isSuccess) {
      refetchDetails();
      onSuccess();
    }
  }, [closePos.isSuccess, liquidate.isSuccess]);

  const handleClose = () => {
    if (closeNeedsApproval) {
      pendingAction.current = "close";
      approveUSDC.approve(total);
    } else {
      closePos.closePosition(positionId);
    }
  };

  const handleLiquidate = () => {
    if (liquidateNeedsApproval) {
      pendingAction.current = "liquidate";
      approveUSDC.approve(totalToRepay);
    } else {
      liquidate.liquidate(positionId);
    }
  };

  const closeLoading    = approveUSDC.isPending || approveUSDC.isConfirming || closePos.isPending || closePos.isConfirming;
  const liquidateLoading = liquidate.isPending || liquidate.isConfirming;

  const closeLabel = closeNeedsApproval
    ? "Approve USDC to Close"
    : `Repay $${formatUSDC(total)} & Close`;

  const liquidateLabel = liquidateNeedsApproval ? "Approve & Liquidate" : "Liquidate";

  const closeLoadingText = (approveUSDC.isPending || approveUSDC.isConfirming) && pendingAction.current === "close"
    ? "Approving…"
    : "Closing…";

  return (
    <div
      className="pl-4 py-4 space-y-3 border-b border-lapo-border/40 last:border-0"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-lapo-muted font-mono uppercase tracking-wider">
            Position #{positionId.toString()}
          </p>
          <p className="text-xl font-bold">
            {formatUnits(pos.collateralAmount, 18)} {token?.symbol ?? "?"}
            <span className="text-lapo-muted text-sm font-normal ml-2">→ ${formatUSDC(pos.borrowedUSDC)} USDC</span>
          </p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
          {healthLabel(hf)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-lapo-muted mb-0.5">Health</p>
          <p className="font-semibold" style={{ color }}>{hf > 0 ? `${hf}%` : "—"}</p>
        </div>
        <div>
          <p className="text-lapo-muted mb-0.5">Interest</p>
          <p className="font-semibold">${formatUSDC(interest ?? 0n)}</p>
        </div>
        <div>
          <p className="text-lapo-muted mb-0.5">Liq. price</p>
          <p className="font-semibold">${liqP.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
        </div>
      </div>

      {(closePos.error || liquidate.error || approveUSDC.error) && (
        <p className="text-xs text-red-400">
          {(closePos.error || liquidate.error || approveUSDC.error)?.message?.slice(0, 160)}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <TxButton
          onClick={handleClose}
          loading={closeLoading}
          loadingText={closeLoadingText}
          className="flex-1"
        >
          {closeLabel}
        </TxButton>
        {hf > 0 && hf < 105 && (
          <TxButton
            onClick={handleLiquidate}
            loading={liquidateLoading}
            loadingText={liquidateNeedsApproval ? "Approving…" : "Liquidating…"}
            variant="danger"
            className="flex-none px-4 !w-auto"
          >
            {liquidateLabel}
          </TxButton>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function BorrowPage() {
  const { address, isConnected } = useAccount();

  const { data: stats }        = usePoolStats();
  const { data: borrowerData, refetch } = useBorrowerInfo(address);
  const { data: prices }       = useTokenPrices();

  const [selectedToken, setSelectedToken] = useState<CollToken>(COLLATERAL_TOKENS[0]);
  const [collAmount, setCollAmount]       = useState("");
  const [borrowAmount, setBorrowAmount]   = useState("");
  const [txMsg, setTxMsg]                 = useState<string | null>(null);

  const apy     = stats?.[4] ?? 0n;

  // Balances + allowances
  const ethBal  = (borrowerData?.[0]?.result as bigint | undefined) ?? 0n;
  const btcBal  = (borrowerData?.[1]?.result as bigint | undefined) ?? 0n;
  const solBal  = (borrowerData?.[2]?.result as bigint | undefined) ?? 0n;
  const balances = [ethBal, btcBal, solBal];

  const ethAllowance = (borrowerData?.[3]?.result as bigint | undefined) ?? 0n;
  const btcAllowance = (borrowerData?.[4]?.result as bigint | undefined) ?? 0n;
  const solAllowance = (borrowerData?.[5]?.result as bigint | undefined) ?? 0n;
  const allowances   = [ethAllowance, btcAllowance, solAllowance];

  const usdcBal   = (borrowerData?.[6]?.result as bigint | undefined) ?? 0n;
  const positionIds = (borrowerData?.[7]?.result as bigint[] | undefined) ?? [];

  // Prices
  const ethPrice = prices?.[0]?.result as bigint | undefined;
  const btcPrice = prices?.[1]?.result as bigint | undefined;
  const solPrice = prices?.[2]?.result as bigint | undefined;
  const priceList = [ethPrice, btcPrice, solPrice];

  const selectedPrice   = priceList[selectedToken.priceIdx];
  const selectedBalance = balances[selectedToken.priceIdx];
  const selectedAllowance = allowances[selectedToken.priceIdx];

  // Derived borrow math
  const collAmountParsed = collAmount ? parseUnits(collAmount, 18) : 0n;
  const collValueUSDC    = selectedPrice && collAmountParsed > 0n
    ? (collAmountParsed * selectedPrice) / BigInt(1e18)
    : 0n;
  const maxBorrow        = collValueUSDC > 0n
    ? (collValueUSDC * 100n) / 135n
    : 0n;
  const borrowParsed     = borrowAmount ? parseUnits(borrowAmount, 6) : 0n;
  const collRatio        = borrowParsed > 0n && collValueUSDC > 0n
    ? Number((collValueUSDC * 100n) / borrowParsed)
    : 0;
  const liqPrice         = borrowParsed > 0n && collAmountParsed > 0n
    ? Number((borrowParsed * 105n * BigInt(1e18)) / (collAmountParsed * 100n)) / 1e6
    : 0;
  const fee              = borrowAmount ? Number(borrowAmount) * 0.005 : 0;
  const disbursed        = borrowAmount ? Number(borrowAmount) - fee : 0;

  const needsApproval    = collAmountParsed > 0n && selectedAllowance < collAmountParsed;
  const insufficientBal  = collAmountParsed > selectedBalance;
  const exceedsMax       = borrowParsed > 0n && borrowParsed > maxBorrow;
  const poolInsufficient = borrowParsed > (stats?.[2] ?? 0n);

  // Write hooks
  const approveCollateral = useApproveCollateral();
  const openPosition      = useOpenPosition();

  const isOpenPending = openPosition.isPending || openPosition.isConfirming;

  useEffect(() => {
    if (openPosition.isSuccess || approveCollateral.isSuccess) {
      refetch();
      const msg = openPosition.isSuccess
        ? "Position opened. USDC sent to your wallet."
        : "Approved. Ready to open position.";
      setTxMsg(msg);
      if (openPosition.isSuccess) {
        setCollAmount(""); setBorrowAmount("");
      }
      setTimeout(() => setTxMsg(null), 5000);
    }
  }, [openPosition.isSuccess, approveCollateral.isSuccess]);

  const handleOpen = () => {
    if (needsApproval) {
      approveCollateral.approve(selectedToken.address, collAmountParsed);
    } else {
      openPosition.openPosition(selectedToken.address, collAmountParsed, borrowAmount);
    }
  };

  const openButtonLabel = needsApproval
    ? `Approve ${collAmount || "0"} ${selectedToken.symbol}`
    : "Open Position";

  const openButtonLoading = approveCollateral.isPending || approveCollateral.isConfirming || isOpenPending;
  const openButtonLoadingText = needsApproval ? "Approving…" : "Opening…";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10 animate-fade-up">
        <h1 className="text-3xl font-bold mb-1">Borrow</h1>
        <p className="text-lapo-muted">
          Put up mwETH, mwBTC, or mwSOL and borrow USDC against it. You need 135% collateral to open a position and it gets liquidated at 105%.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-12">

        {/* Left: token balances + stats */}
        <div className="lg:col-span-2 space-y-8">

          {isConnected ? (
            <>
              {/* Collateral balances */}
              <div>
                <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
                  Your collateral
                </p>
                <div className="space-y-3">
                  {COLLATERAL_TOKENS.map((token, i) => {
                    const price = priceList[i];
                    const bal   = balances[i];
                    const usdVal = price && bal > 0n ? Number(bal) * Number(price) / 1e24 : 0;
                    return (
                      <div key={token.symbol} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-base" style={{ color: token.color }}>{token.icon}</span>
                          <span className="text-sm font-medium">{token.symbol}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{(Number(bal) / 1e18).toFixed(4)}</p>
                          <p className="text-[10px] text-lapo-muted">≈ ${usdVal.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ethBal === 0n && btcBal === 0n && solBal === 0n && (
                  <div className="mt-4 p-3 border border-lapo-border/40 rounded text-xs text-lapo-muted">
                    No collateral yet.{" "}
                    <Link href="/faucet" className="text-lapo-blue hover:text-lapo-cyan transition-colors">
                      Get testnet tokens →
                    </Link>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6 pt-2">
                <StatCard label="USDC balance" value={`$${formatUSDC(usdcBal)}`} accent />
                <StatCard label="Borrow APY"   value={`${formatBps(apy)}%`}       cyan />
              </div>
            </>
          ) : (
            <p className="text-sm text-lapo-muted">Connect your wallet to borrow.</p>
          )}

          {/* Ratio guide */}
          <div className="border-t border-lapo-border pt-6">
            <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
              Collateral ratios
            </p>
            <div className="space-y-0">
              {[
                { label: "Min to open",     value: "135%", color: "#22c55e", note: "You start here" },
                { label: "Caution zone",    value: "115–130%", color: "#f59e0b", note: "Top up collateral" },
                { label: "Liquidation",     value: "105%",  color: "#ef4444", note: "Anyone can liquidate" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between py-2.5 border-b border-lapo-border/30 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    <span className="text-sm">{r.label}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold" style={{ color: r.color }}>{r.value}</span>
                    <p className="text-[10px] text-lapo-muted">{r.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: open position + positions list */}
        <div className="lg:col-span-3 space-y-10">

          {isConnected && (
            <div className="animate-fade-up">
              <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-6">
                Open a position
              </p>

              {/* Token selector */}
              <div className="flex gap-0 border-b border-lapo-border/40 mb-8">
                {COLLATERAL_TOKENS.map(token => (
                  <button
                    key={token.symbol}
                    onClick={() => { setSelectedToken(token); setCollAmount(""); setBorrowAmount(""); }}
                    className={cn(
                      "flex-1 pb-3 text-sm font-semibold border-b-2 -mb-px transition-all flex items-center justify-center gap-1.5",
                      selectedToken.symbol === token.symbol
                        ? "text-white border-lapo-blue"
                        : "text-lapo-muted border-transparent hover:text-white/60"
                    )}
                  >
                    <span style={{ color: token.color }}>{token.icon}</span>
                    {token.symbol}
                  </button>
                ))}
              </div>

              {/* Collateral amount input */}
              <div className="border-b border-lapo-border focus-within:border-lapo-blue pb-3 mb-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-lapo-muted uppercase tracking-[0.14em]">Collateral</span>
                  <button
                    onClick={() => setCollAmount((Number(selectedBalance) / 1e18).toFixed(6))}
                    className="text-xs font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors"
                  >
                    MAX &nbsp;<span className="text-lapo-muted font-normal">{(Number(selectedBalance) / 1e18).toFixed(4)} {selectedToken.symbol}</span>
                  </button>
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    value={collAmount}
                    onChange={e => setCollAmount(e.target.value)}
                    placeholder="0.0000"
                    className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-lapo-muted/20 focus:outline-none"
                  />
                  <span className="text-lapo-muted font-medium pb-1">{selectedToken.symbol}</span>
                </div>
                {collValueUSDC > 0n && (
                  <p className="text-xs text-lapo-muted mt-1">
                    ≈ ${formatUSDC(collValueUSDC)} USDC · max borrow ${formatUSDC(maxBorrow)}
                  </p>
                )}
              </div>

              {/* Borrow amount input */}
              <div className="border-b border-lapo-border focus-within:border-lapo-blue pb-3 mb-8 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-lapo-muted uppercase tracking-[0.14em]">Borrow</span>
                  {maxBorrow > 0n && (
                    <button
                      onClick={() => setBorrowAmount(formatUSDC(maxBorrow, 6).replace(/,/g, ""))}
                      className="text-xs font-semibold text-lapo-blue hover:text-lapo-cyan transition-colors"
                    >
                      MAX &nbsp;<span className="text-lapo-muted font-normal">${formatUSDC(maxBorrow)}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <input
                    type="number"
                    value={borrowAmount}
                    onChange={e => setBorrowAmount(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 bg-transparent text-4xl font-bold text-white placeholder:text-lapo-muted/20 focus:outline-none"
                  />
                  <span className="text-lapo-muted font-medium pb-1">USDC</span>
                </div>
              </div>

              {/* Preview */}
              {borrowAmount && Number(borrowAmount) > 0 && collValueUSDC > 0n && (
                <div className="space-y-3 text-sm mb-8 animate-fade-up">
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">Origination fee (0.5%)</span>
                    <span className="text-red-400">−${fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">You receive</span>
                    <span className="font-semibold">${disbursed.toFixed(2)} USDC</span>
                  </div>
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">Collateral ratio</span>
                    <span className="font-semibold" style={{ color: healthColor(collRatio) }}>
                      {collRatio > 0 ? `${collRatio.toFixed(0)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-lapo-border/40 pb-2">
                    <span className="text-lapo-muted">Liquidation price ({selectedToken.symbol})</span>
                    <span className="font-semibold text-red-400">
                      ${liqPrice > 0 ? liqPrice.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-lapo-muted">Borrow APY</span>
                    <span>{formatBps(apy)}%</span>
                  </div>
                </div>
              )}

              {insufficientBal && collAmount && (
                <p className="text-xs text-red-400 mb-4">
                  Insufficient {selectedToken.symbol} balance.
                </p>
              )}
              {exceedsMax && (
                <p className="text-xs text-red-400 mb-4">
                  Borrow amount exceeds maximum (${formatUSDC(maxBorrow)}).
                </p>
              )}
              {poolInsufficient && borrowAmount && !exceedsMax && (
                <p className="text-xs text-red-400 mb-4">
                  Pool has insufficient USDC liquidity for this loan.
                </p>
              )}

              {txMsg && (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-4 animate-fade-up">
                  <CheckCircle size={14} /> {txMsg}
                </div>
              )}

              {(openPosition.error || approveCollateral.error) && (
                <p className="text-xs text-red-400 mb-4">
                  {(openPosition.error || approveCollateral.error)?.message?.slice(0, 160)}
                </p>
              )}

              <TxButton
                onClick={handleOpen}
                disabled={
                  !collAmount || Number(collAmount) <= 0 ||
                  !borrowAmount || Number(borrowAmount) <= 0 ||
                  insufficientBal || exceedsMax || poolInsufficient
                }
                loading={openButtonLoading}
                loadingText={openButtonLoadingText}
              >
                {openButtonLabel}
              </TxButton>
            </div>
          )}

          {/* Open positions */}
          {isConnected && positionIds.length > 0 && (
            <div className="animate-fade-up">
              <p className="text-[11px] font-medium text-lapo-muted uppercase tracking-[0.14em] mb-4">
                Your positions
              </p>
              <div>
                {positionIds.map(id => (
                  <PositionRow
                    key={id.toString()}
                    positionId={id}
                    onSuccess={refetch}
                  />
                ))}
              </div>
            </div>
          )}

          {!isConnected && (
            <p className="text-sm text-lapo-muted">Connect your wallet to access borrowing.</p>
          )}
        </div>
      </div>
    </div>
  );
}
