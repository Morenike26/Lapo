# Lapo — Permissionless Lending on Arc

A reputation-gated USDC lending protocol on [Arc Testnet](https://arc.network).

- **Lenders** deposit USDC and earn yield (90% of all interest)
- **Borrowers** build an on-chain credit score and unlock progressive USDC credit lines
- **Protocol** earns 0.5% origination fee + 10% of interest

## Contract

`LapoLending.sol` deployed on Arc Testnet:
```
0xd426b2Cbd493ea8Ab8cf98348b86497F0A04Af24
```

USDC: `0x3600000000000000000000000000000000000000`

## Interest Rate Model

```
APY = 5% + utilization × 45%
```
At 0% utilization → 5% APY. At 100% → 50% APY.

## Reputation Tiers

| Score  | Tier     | Max credit  |
|--------|----------|-------------|
| 0–99   | Unrated  | No access   |
| 100–299| Starter  | $1,000      |
| 300–599| Trusted  | $5,000      |
| 600–999| Verified | $20,000     |
| 1000   | Prime    | $50,000     |

## Local Development

```bash
cp .env.example .env.local
npm install
npm run dev
```

## Contracts

```bash
cd contracts
forge build
forge test -vv
```

Deploy:
```bash
make deploy   # requires PRIVATE_KEY in .env
```
