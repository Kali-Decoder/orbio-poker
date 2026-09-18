# @nli/poker-pool

Midnight **Compact** vault for poker pool markets.

On-chain: **deposit** (buy-in) and **claim** (cash-out).  
Off-chain: chips, dealing, betting, showdown.

Skills used: `compact`, `example-payment-dapp`, `example-locker-dapp`, `token-transfers`.

## Flow

```
Deploy pool (entryAmount + chipMultiplier)
        │
        ▼
Player deposit(entryAmount NIGHT Stars)  ──►  vault holds NIGHT
        │
        ▼
Server credits chips = night × chipMultiplier
  e.g. 100 NIGHT × 10 = 1,000 chips
        │
        ▼
Off-chain No-Limit Hold'em
        │
        ▼
House settle(player, stars)  ──►  claimable[player] = payout
        │
        ▼
Player claim(player)  ──►  95% NIGHT → player
                          5% NIGHT → treasury
```

## Markets

One **contract deploy per market**. Presets in `src/markets.ts`:

| Market | Entry | Multiplier | Chips |
|--------|-------|------------|-------|
| micro  | 10 NIGHT | ×10 | 100 |
| low    | 100 NIGHT | ×10 | 1,000 |
| mid    | 500 NIGHT | ×10 | 5,000 |
| high   | 1,000 NIGHT | ×10 | 10,000 |

Amounts on-chain are **Stars** (`1 NIGHT = 1_000_000 Stars`).

Constructor args: `entry`, `multiplier`, `houseSecret`, `treasuryAddress`.
`treasuryFeeBps` is sealed at **500** (5%).

```ts
import {
  nightToStars,
  chipsFromDeposit,
  splitClaim,
  POOL_MARKET_PRESETS,
} from '@nli/poker-pool';

const market = POOL_MARKET_PRESETS.find((m) => m.id === 'low')!;
const entryStars = nightToStars(market.entryNight); // constructor arg
const chips = chipsFromDeposit(market.entryNight, market.chipMultiplier); // 1000n
const { toPlayer, toTreasury } = splitClaim(entryStars); // 95% / 5%
```

## Circuits

| Circuit | Who | What |
|---------|-----|------|
| `deposit(player)` | Player | `receiveUnshielded` exactly `entryAmount` |
| `settle(player, amount)` | House | Sets `claimable[player]` (off-chain result) |
| `claim(player)` | Anyone → player addr | 95% to player, 5% to sealed `treasury` |

House auth: `houseKey` witness → `persistentHash("poker-pool:house:v1" ‖ sk)`.

## Compile

```bash
# TypeScript only (fast)
pnpm --filter @nli/poker-pool compact:fast

# Full ZK keys (needed before deploy / prove)
pnpm --filter @nli/poker-pool compact
```

Output: `src/managed/poker-pool/{contract,zkir,keys}/`

Sync `keys` + `zkir` into the Next app as `public/zk/poker-pool/` before browser proving (see `1am-wallet` / `example-payment-dapp`).

## Trust model

Poker outcomes are **off-chain**. The house key can set any claimable ≤ vault. Harden later with multi-sig, delayed settle, or ZK game proofs.
