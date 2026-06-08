import { NextResponse } from "next/server";
import { createWalletClient, createPublicClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const ARC = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
} as const;

const ORACLE_ABI = parseAbi([
  "function setBatchPrices(address[] calldata tokens, uint256[] calldata priceList) external",
]);

const TOKEN_ADDRESSES = [
  process.env.NEXT_PUBLIC_MWETH_ADDRESS ?? "0xb1d4C6590C9585c873b1eA55d0Ac6DADA1349Df0",
  process.env.NEXT_PUBLIC_MWBTC_ADDRESS ?? "0x4f4a7381d4C5F1B8AcA8E00B9bDA4aa8426Db111",
  process.env.NEXT_PUBLIC_MWSOL_ADDRESS ?? "0xc75761a81fc7684da0d2C6729A2123FF486b98b4",
] as `0x${string}`[];

const CG_IDS = ["ethereum", "bitcoin", "solana"];

const ORACLE = (process.env.NEXT_PUBLIC_ORACLE_ADDRESS ?? "0x58859f6B736779044D55355dD3f2F5a4D2192C77") as `0x${string}`;
const PK     = (process.env.ORACLE_UPDATER_PK ?? "") as `0x${string}`;

export async function GET() {
  if (!PK || PK === "0x") {
    return NextResponse.json({ error: "ORACLE_UPDATER_PK not set" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${CG_IDS.join(",")}&vs_currencies=usd`,
      { cache: "no-store" }
    );
    const data = await res.json() as Record<string, { usd: number }>;

    const prices = CG_IDS.map(id => BigInt(Math.round((data[id]?.usd ?? 0) * 1e6)));
    const usdValues = CG_IDS.map((id, i) => ({ token: id, usd: data[id]?.usd ?? 0 }));

    const account = privateKeyToAccount(PK);
    const wallet  = createWalletClient({ account, chain: ARC, transport: http() });

    const hash = await wallet.writeContract({
      address: ORACLE,
      abi: ORACLE_ABI,
      functionName: "setBatchPrices",
      args: [TOKEN_ADDRESSES, prices],
      gas: 200_000n,
    });

    return NextResponse.json({
      ok: true,
      prices: usdValues,
      hash,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message?.slice(0, 300) }, { status: 500 });
  }
}
