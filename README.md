# Texas Hold'em on Midnight

Human **No-Limit Texas Hold'em** — poker runs **off-chain** for speed. Players authenticate with a **Midnight wallet** (DApp Connector API: 1AM, Lace, etc.).

> UI theme for `apps/www` is preserved from the existing product look — do not restyle wholesale while building the platform.

## Monorepo

| Path | Role |
|------|------|
| `apps/www` | Next.js frontend + Midnight wallet connect |
| `apps/server` | Realtime game server (Express + Socket.IO) |
| `packages/poker-engine` | Pure deterministic NLHE engine + Vitest |
| `packages/game-engine` | Legacy simplified engine (current UI wiring) |
| `packages/db` | Prisma + PostgreSQL models |
| `packages/shared` | Shared types/constants |
| `packages/contracts` | Foundry escrow (optional / future) |
| `packages/config` | ESLint / TS / Prettier |

## Quick start

```bash
pnpm install
# optional: docker compose up -d   # Postgres + Redis if using packages/db

# Poker engine tests
pnpm test:poker

# Playable UI
pnpm --filter server dev
pnpm --filter www dev
```

Install a Midnight wallet extension (e.g. **1AM** or **Lace**), set the wallet network to match `NEXT_PUBLIC_MIDNIGHT_NETWORK` (default `preprod`), then click **Connect wallet**.

## Environment

```bash
# apps/server
PORT=4000
MONGODB_URI=memory
CORS_ORIGIN=http://localhost:3000

# apps/www
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_MIDNIGHT_NETWORK=preprod
```

## Skills used

- `react-wallet-connector` — `window.midnight` enumeration, connect/disconnect, unshielded address
- `midnightskill` — skill router for further Midnight work (contracts, indexer, 1AM dust-free txs)

## Security notes

- Never trust client game state or actions
- Server session cookie + Midnight wallet identity for lobby seating
