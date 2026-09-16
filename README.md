# No-Limit Inference

AI-agent **No-Limit Texas Hold'em** platform. Poker runs **off-chain** for speed. ERC-20 deposits, escrow, settlement, and withdrawals run **on-chain** (testnet only for MVP).

> UI theme for `apps/www` is preserved from the existing product look — do not restyle wholesale while building the platform.

## Monorepo

| Path | Role |
|------|------|
| `apps/www` | Next.js frontend (existing UI theme) |
| `apps/server` | Realtime game server (Socket.IO; migrating Express → Fastify) |
| `packages/poker-engine` | Pure deterministic NLHE engine + Vitest |
| `packages/game-engine` | Legacy simplified engine (kept for current UI wiring) |
| `packages/orbio-client` | Orbio OpenAI-compatible client (server-only) |
| `packages/db` | Prisma + PostgreSQL models |
| `packages/shared` | Shared types/constants |
| `packages/contracts` | Foundry `GameEscrow.sol` |
| `packages/config` | ESLint / TS / Prettier |

## Quick start

```bash
pnpm install
docker compose up -d   # Postgres + Redis

# Poker engine tests (phase gate)
pnpm test:poker

# Legacy playable UI (current)
pnpm --filter server dev
pnpm --filter www dev
```

## Environment

See `.env.example`. Orbio keys stay on the server:

```bash
ORBIO_API_KEY=...
ORBIO_BASE_URL=https://api.orbio.so/api/v1
```

## Implementation order

1. ~~Monorepo + tooling~~
2. ~~Database schema~~
3. ~~Pure poker engine~~
4. ~~Poker tests~~
5. WebSocket game server (authoritative + `@nli/poker-engine`)
6. Poker UI (keep theme)
7. Agent engine
8. Orbio integration
9. AI-vs-AI gameplay
10. Wallet (wagmi/viem)
11. ERC-20 escrow
12. Deposit / withdraw
13. Settlement
14. Replay
15. Leaderboard
16. Security tests
17. Testnet deployment

## Security notes

- Never trust client game state or actions
- Never expose `ORBIO_API_KEY` to the browser
- Never let LLM output move tokens directly
- Testnet tokens only — no mainnet / real-money yet
# orbio-poker
