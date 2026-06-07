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
  "function setPrice(address token, uint256 priceUSDC) external",
]);

const TOKENS: Record<string, string> = {
  ethereum: process.env.NEXT_PUBLIC_MWETH_ADDRESS ?? "0xb1d4C6590C9585c873b1eA55d0Ac6DADA1349Df0",
  bitcoin:  process.env.NEXT_PUBLIC_MWBTC_ADDRESS ?? "0x4f4a7381d4C5F1B8AcA8E00B9bDA4aa8426Db111",
  solana:   process.env.NEXT_PUBLIC_MWSOL_ADDRESS ?? "0xc75761a81fc7684da0d2C6729A2123FF486b98b4",
};

const ORACLE = (process.env.NEXT_PUBLIC_ORACLE_ADDRESS ?? "0x58859f6B736779044D55355dD3f2F5a4D2192C77") as `0x${string}`;
const PK     = (process.env.ORACLE_UPDATER_PK ?? "") as `0x${string}`;

export async function GET() {
  if (!PK || PK === "0x") {
    return NextResponse.json({ error: "ORACLE_UPDATER_PK not set" }, { status: 500 });
  }

  try {
    // Fetch live prices from CoinGecko
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana&vs_currencies=usd",
      { next: { revalidate: 0 } }
    );
    const data = await res.json() as Record<string, { usd: number }>;

    const account = privateKeyToAccount(PK);
    const wallet  = createWalletClient({ account, chain: ARC, transport: http() });
    const public_ = createPublicClient({ chain: ARC, transport: http() });

    const updates: { token: string; price: number; hash: string }[] = [];

    for (const [id, tokenAddress] of Object.entries(TOKENS)) {
      const usd  = data[id]?.usd;
      if (!usd) continue;
      // USDC 6 dec per 1e18 token units
      const price = BigInt(Math.round(usd * 1e6));

      const hash = await wallet.writeContract({
        address: ORACLE,
        abi: ORACLE_ABI,
        functionName: "setPrice",
        args: [tokenAddress as `0x${string}`, price],
        gas: 80_000n,
      });

      updates.push({ token: id, price: usd, hash });
    }

    return NextResponse.json({ ok: true, updates, timestamp: new Date().toISOString() });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
