# @nli/contracts

Foundry package for **GameEscrow** — testnet ERC-20 deposit / settle / withdraw.

Poker gameplay is off-chain. Only escrow movements happen on-chain.

## Commands

```bash
cd packages/contracts
forge install foundry-rs/forge-std --no-commit
forge build
forge test
```

## Env

```bash
TOKEN_ADDRESS=0x...
CHAIN_ID=11155111
SEPOLIA_RPC_URL=https://...
```

Do **not** deploy to mainnet for the MVP.
