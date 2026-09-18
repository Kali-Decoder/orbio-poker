# Midnight research — what's built, what Midnight can give us, and the product that earns it

Status: research doc, Sep 2026. Verified against this repo and `docs.midnight.network`. Open questions/opinions are marked; nothing else is asserted from memory.

---

## 0. TL;DR

- What we built so far is **web poker on a trusted server** + one Midnight contract that runs a **buy-in / cash-out vault in plain NIGHT**.
- The vault is entirely **unshielded** (address → amount is public on-chain) and the deal is **not verifiable** (server sees every card; house trusted).
- That means today we get **~zero** of Midnight's real value (privacy, selective disclosure, auditability) — the Midnight dependency is cosmetic.
- Midnight **mainnet is live** (Mar 30, 2026, federated). The primitives to fix this exist today: shielded tokens, commitments/nullifiers, witnesses, indexer, DUST economics.
- To "do justice to Midnight" we must do two things, in order: **1) make the money shielded**, **2) make the deal verifiable**. Then monetize with real users on mainnet.

---

## 1. Midnight facts that matter (from `docs.midnight.network`, Sep 2026)

### Network status
- **Mainnet went live Mar 30, 2026** (genesis block Mar 17, 2026), in a **federated ("guarded", Kūkolu) phase**. Genesis block produced by institutional/federated operators: Google Cloud, MoneyGram, Worldpay, Bullish, eToro, Blockdaemon, Vodafone (Pairpoint), Telegram, AlphaTON Capital, Shielded Technologies.
- Next phase **Mōhalu** (targeted mid-2026): Cardano SPOs come online as block producers, **DUST Capacity Exchange** activates, staking rewards go live, transition toward decentralization.
- Real deployments already: **Monument Bank (UK) plans £250M (~$335M) of retail deposits tokenized on Midnight** — first UK-regulated bank on a public blockchain.
- Toolchain moves fast: Compact was `0.28.0` at mainnet launch; a Sep 2026 official tutorial uses **compactc `0.31.1`**. **Our `pragma language_version >= 0.23` + compact-runtime `0.16.0` is old — expect a bump.**

### Tokens (docs `/tokens/overview`)
- One native token **NIGHT** (utility/governance; generates DUST) and one native resource **DUST** (transaction fuel). Dual ledger: **shielded** (private) and **unshielded** (public) state.
- **NIGHT is an unshielded token: balances and transfers are always public. There is no mechanism to move a token between shielded and unshielded state** — shielded/unshielded tokens are **distinct token types** in **separate pools**. Privacy comes from the **token type**, not the address that holds it.
- Custom tokens: `mintShieldedToken` (private, value lives in immutable coins) and `mintUnshieldedToken` (public balances).
- Every transaction requires **DUST** (shielded, non-transferable). Unit facts below.

### DUST / fees (`/concepts/dust-architecture`)
- `1 NIGHT = 10^6 Stars`; `1 DUST = 10^15 Specks`.
- DUST is generated from NIGHT up to a cap of **5 DUST / NIGHT**; full recharge ≈ **7 days** (604,800 s).
- DUST growth/decay per UTXO; non-persistent; can be redistributed on hardfork.
- On a fresh wallet, most NIGHT today arrives via cross-chain **cNIGHT (Cardano)**; DUST registration takes ~**12h** to finalize. **Local network: DUST in ~5 min.** Delay disappears when native mNIGHT launches.
- DUST can be delegated / swapped via the upcoming **Capacity Exchange** → DApp can pay a user's DUST so they don't need to hold crypto.

### Shielded tokens (`/tokens/shielded-token`)
- No public balance. Chain records **commitments and nullifiers, not amounts**. A contract cannot read its own shielded balance — it must track its own coins.
- Value lives in immutable coins: `ShieldedCoinInfo { nonce, color, value }`. Moving part of a coin returns a **change** coin; nonces derived deterministically with `evolveNonce(nonceIndex, seed)`.
- Fresh coins (same tx) → `sendImmediateShielded`. **Committed coins** (already in ledger) → `sendShielded`, which requires a `QualifiedShieldedCoinInfo` carrying the coin's **Merkle index (`mt_index`)** — you must obtain that from the indexer; the mt_index plumbing is explicitly the "not copy-paste-ready" part.
- **Hard constraint for payouts:** `sendShielded` today *does not create coin ciphertexts*, so sending shielded value to a user *other than the caller* **will not notify them** of the coin. A contract can reliably deliver shielded value **only to the caller**. Cross-user shielded payouts need an indexer-polling sync flow.
- Authorization gotcha from the tutorial: **`ownPublicKey()` returns a prover-claimed value with no binding to the signer** — anyone can bypass a check on it. Our contract already avoids this (auth via `deriveHouseKey(secret)` hash), good.

### Privacy model
- Shielded ≠ invisible forever; it's **selective disclosure**: keep data private by default, reveal to authorized parties (audit, compliance, dispute) or on-chain when the app chooses.

---

## 2. What is built today (verified in repo)

### Live and wired (what actually runs end-to-end)
| Piece | Where | Reality |
|---|---|---|
| Web UI (rooms, cards, leaderboard, profile, wallet connect button) | `apps/www` (Next.js 14) | Runs. Connects wallet, reads balances only. |
| Realtime server + lobby + session auth | `apps/server` (Express + Socket.IO + Mongoose/Mongo) | Runs. Cookie session (`poker_session`), games, events, leaderboard. |
| Simplified poker engine | `packages/game-engine` | Runs. **Not real NLHE**: no blinds, no raises, players pick 3 community values, `getWeightFromIds` names a winner. Server is source of truth. |
| Wallet connection | `apps/www/src/providers/midnight-wallet-provider.tsx` | Runs. `connect()` → reads `unshieldedAddress`, `getUnshieldedBalances()`, `getShieldedBalances()`, `getDustBalance()`. **No transactions, no deploy, no contract call.** |

### Built but entirely unwired (dead code until integrated)
| Piece | Where | Status |
|---|---|---|
| **Real deterministic NLHE engine** | `packages/poker-engine` | Complete + Vitest-tested: blinds, button rotation, min-raise, all-in reopen, **side pots (`pots.ts`/`buildPots`)**, showdown, hand rankings. **Zero importers.** |
| **Compact pool vault** | `packages/poker-pool/src/poker-pool.compact` | Written (`deposit`/`settle`/`claim`, 5% treasury fee, house auth witness). **Never compiled**: `src/managed/` doesn't exist, so `src/index.ts` is broken. |
| Markets/units helpers | `packages/poker-pool/src/markets.ts` | Pure TS (Stars↔NIGHT, chips, `splitClaim`). Standalone, fine. |
| Shared types / Prisma schema | `packages/shared`, `packages/db` | `@nli/db` (Postgres schema) and `@nli/shared` have **no importers**. README claims Postgres+Prisma, but server uses Mongo. |

### Numbers that are frozen/broken (bugs, not design)
- **Session chips are immortal**: `chips: 10000` is set at auth and **never updated** (`apps/server/src/auth.ts:35`, db default `db.ts:8`). Winners are never credited, losers never debited. Leaderboard ranks on wins/pots, not real accounts.
- **Ante/round flow has no timeouts**: a stalled player stalls the table forever; no disconnect handling beyond socket close.
- **No on-chain anything is wired**: no deploy script, no deposit/claim UI, no indexer reads, no ZK assets served to the browser, no proof-server config. `compact-runtime` at `0.16.0` vs docs' current `0.31.1`.

---

## 3. Privacy audit — what actually leaks today

On-chain (public to anyone watching the indexer):
1. `deposit` uses **`receiveUnshielded(nativeToken(), entryAmount)`** — `poker-pool.compact:63`. Who deposited, how much, and when is public.
2. `deposited: Map<UserAddress, Uint<128>>` (`:31`) permanently **binds wallet address → total buy-in**. `claimable` (`:34`) binds **address → payout**. Both are open ledger.
3. `claim` uses **`sendUnshielded`** (`:112`) — winnings are public.
4. `settle` names the player and the payout on-chain (`:82`).

Off-chain (visible to the house — us):
5. Backing Mongo stores every game's **full deck and every player's hole cards in plaintext** (`db.ts:37` `state: Schema.Types.Mixed`; `game-store.ts` persists `state`). `toPublicView` only masks them from *other players* (`game.ts:344`).
6. Anonymous observers of the chain learn **who plays and how much they stake/win** from items 1–4.

So the only actual "privacy" today: opponents can't see your cards. Any poker site on any stack has that. Midnight earns us nothing yet.

---

## 4. Product thesis — what we should actually sell

Two honest moats exist on Midnight that a conventional server cannot offer, and both map to real poker-player pain:

**Moat A — Private money.** Real-money players don't want their buy-ins and cash-outs on a public ledger (employers, tax, networks, "whale-watching"). Sunset: deposit in **shielded CHIP**, play anonymously, cash out without anyone seeing the flow or the stake.

**Moat B — Verifiable deal.** Players don't trust the house not to rig the deck. Commit the deck on-chain per hand and reveal progressively with proofs, so the house *cannot* silently alter cards mid-hand and *everyone can replay the hand and verify payouts* afterward. This is the only genuinely new feature any poker product can ship right now (reference repo `Ansh-Sonkusare/midnight-poker` is a pure PRD for exactly this; it has no implementation — we'd be building the actual first one).

Target: Midnight-native users (NIGHT holders already have DUST + a wallet) plus privacy/fairness-focused players from off-chain poker. Monetization: rake (per-hand fee, see section 5), the 5% treasury fee already in the contract, market entry presets.

---

## 5. Roadmap — the work that does Midnight justice

### Phase 0 — Ship what we have, wired and honest (privacy story: "private by default, still bridging")
Goal: working real-money MVP on preprod with the *current* contract, so we get a live product and learn. Explicitly **not** the privacy win yet — shipped to be replaced by Phase 1.

- Compile the contract (`pnpm --filter @nli/poker-pool compact:fast`, then full `compact` for proving) and put generated `managed/*` in place so the package builds.
- Wire `poker-engine` (real NLHE: blinds, side pots, all-in) into `apps/server`/`apps/www` to replace `game-engine`.
- Fix chip accounting (credit winners / debit losers against Session).
- Add turn **timeouts** → auto-fold (borrowed from reference repo's `timeout_block`/`foldInactive` design; we use server-time).
- **Per-hand rake**: deduct a small sealed fee per seated player at hand end (reference repo `per_hand_fee`, `payments.md` PF-1..3) — first real revenue on-chain.
- Deploy one vault per market on preprod; wire UI `deposit` (ConnectButton → `deposit(player)`) and `claim` in the player profile.
- Publish ZK assets (`public/zk/poker-pool/`) so browser proving works (1AM-wallet/reference patterns).

### Phase 1 — Private money (this is where Midnight actually starts)
Goal: nobody can tell who stakes or what they win.

- Mint a **shielded CHIP** (`mintShieldedToken`) as the table currency; players acquire CHIP via a funding edge (buy with NIGHT → wrapped via a shielded-mint flow).
- Rework vault to hold **shielded coins**: drop the address-keyed public `deposited`/`claimable` maps; model claim entitlement as a **commitment + nullifier** instead of a public amount.
- `deposit`/`claim` move shielded value. **Respect the caller-delivery constraint**: claims should be caller-signed (player claims for self), not "house sends to someone else's address" — cross-user shielded delivery needs an indexer sync flow (`QualifiedShieldedCoinInfo` + `mt_index`, pool for coin ciphertexts). Design claims as player-initiated so we stay on the reliably-supported path.
- Keep unshielded NIGHT only at the fiat/join edges; NIGHT is structurally public (docs), so say so and hide what we can (amounts, identities off the play flow).

### Phase 2 — Verifiable deal (the product differentiator)
Goal: house cannot rig a hand, everyone can audit any hand.

- Cheap first: per hand, **commit the deck root on-chain**; reveal community + winner proof per street against it. Catches silent tampering, small circuit.
- Full version (reference repo's design, docs-supported): Poseidon **Merkle deck** (52 leaves, depth-6, leaf = `hash(card || blind)`), **ZK shuffle proof** per hand proving a valid 52-card permutation, per-street **Merkle reveals**, full-deck end-of-hand reveal for replay. Costs to carry: proving keys ~100–300 MB per witness, a **proof server** on a VPS, encrypted hole cards. This is a big build — Phase 3 says when.

### Phase 3 — Real users, real money, mainnet
- Launch on mainnet under the federated network with a guarded rollout (devs must pass Foundation criteria + preprod first — plan for it).
- Fee table live: per-hand rake + 5% treasury.
- **DUST UX**: most fresh users have no DUST and registration is slow (12h cNIGHT today). Use the **Capacity Exchange-DUST delegation** path (Mōhalu) and/or run a proof server so users pay in app, not gas-facing.
- Governance token / loyalty off later; don't build before revenue.

Phase | Build | Midnight value unlocked
|---|---|---|
| 0 | Wire real engine + vault + rake + timeouts | Product exists, honest money flow (revenue) |
| 1 | Shielded CHIP, commitments over public maps | **Privacy moat** |
| 2 | Committed deck + ZK shuffle + replay | **Fairness moat** |
| 3 | Mainnet + DUST UX + commerce | Real money at scale |

---

## 6. Numbers quick-reference (all from docs, Sep 2026)

- Mainnet live Mar 30, 2026; federated; Mōhalu (decentralization + Capacity Exchange) targeted mid-2026.
- NIGHT ≈ $0.033 (market), supply 24B, mcap ≈ $541M (May 2026, third-party reporting — *re-check before quoting*).
- `1 NIGHT = 10^6 Stars`; `1 DUST = 10^15 Specks`.
- DUST cap 5 DUST/NIGHT; full recharge ~7 days; local network ~5 min; cNIGHT path ~12h registration.
- Compact: `0.28.0` at mainnet; tutorial toolchain `compactc 0.31.1` Sep 2026. Ours: runtime `0.16.0`, pragma `>= 0.23`.
- Shielded coin = `{nonce, color, value}`; committed coin needs `mt_index` (from indexer).
- Proving-key size estimate for full shuffle/deck witnesses: 100–300 MB each (reference repo estimate, not docs).

---

## 7. Risks & honest open questions

- **The current contract is a trust-me vault.** If we ship Phase 0 as-is to real money, that is fine only while the house is "a company players trust". Phase 2 replaces it.
- **Payout privacy is constrained today.** Shielded sends to non-callers don't notify recipients; multi-user shielded payouts need indexer sync and want test loops (that's why Phase 1 favors player-initiated claims).
- **DUST is a real onboarding tax.** 12h cNIGHT registration and 7-day recharge shape every flow; watch the Capacity Exchange for a delegation shortcut.
- **Version drift.** `0.16.0` runtime is multiple majors behind docs (`0.28.0`/`0.31.1`); the contract may need syntax-level changes on first real compile.
- **Two engines.** Shipping Phase 0 means choosing `poker-engine` (real) and retiring `game-engine`; don't keep both.
- **Regulation.** Real-money poker + tokenized value = licensing questions in most jurisdictions. Get compliant before mainnet marketing.
- Non-goals we should keep as non-goals (reference repo agrees): unlimited mid-hand rebuy, tables with >6 seats, on-chain blinds for a first version.

---

## 8. Where things live (map)

| Concern | Location |
|---|---|
| Compact vault | `packages/poker-pool/src/poker-pool.compact` |
| Real engine (unwired) | `packages/poker-engine/src/engine.ts` |
| Wired engine (legacy) | `packages/game-engine/src/game.ts` |
| Server/sockets/auth | `apps/server/src/{index,socket,auth,game-store,routes,db}.ts` |
| Wallet provider (reads only) | `apps/www/src/providers/midnight-wallet-provider.tsx` |
| Frontend | `apps/www/src/app`, `apps/www/src/components` |
| Revenue hook in contract | `treasuryFeeBps=500` (`poker-pool.compact:51`), `claim` split (`:102`) |

---

## 9. Bottom line

We have a working web-poker shell, a tested real engine nobody calls, and a vault contract that was never compiled or wired, using no privacy primitive. That is the honest starting point. The path that earns the "built on Midnight" label is: **ship the product (0) → shield the money (1) → make the deal provable (2) → mainnet commerce (3)**. Steps 1 and 2 are the entire reason to be on this chain; everything else we could have built on plain AWS.