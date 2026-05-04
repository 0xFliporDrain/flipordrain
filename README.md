# FlipOrDrain

![Solana](https://img.shields.io/badge/Solana-black?logo=solana) ![Anchor](https://img.shields.io/badge/Anchor-blueviolet) ![Status](https://img.shields.io/badge/status-live%20%C2%B7%20devnet-brightgreen) ![License](https://img.shields.io/badge/license-MIT-green)

on-chain coin flip. 50/50 against the house. win 1.9x, lose it all, or push your luck with double-or-nothing.

> **🎰 [play it on devnet →](https://flipordrain.app)** — connect any phantom/solflare/backpack wallet, hit the faucet, flip away.

devnet program: `2JLBJ794NCQAwmqKVmcKjcKYmPkCfpXwxpRvDo4BWdh3`

## screens

| | |
|---|---|
| ![play tab](docs/screens/play.png) | ![history tab](docs/screens/history.png) |
| **play** — pick side, set amount, watch the coin spin | **history** — every flip, filterable, explorer-linked |

> screenshots are placeholders — drop fresh ones into `docs/screens/` when the next build lands.

## what

a single-action gambling primitive on solana. no swaps, no order books, no LP positions — pick heads or tails, wager SOL, and the vault either pays you or eats it.

- **bet** — 0.05 to 5 SOL per flip, configurable on-chain
- **payout** — 1.9x on win (5% house edge baked into the multiplier)
- **double** — instead of claiming, roll the win into a fresh 1.9x flip
- **streak** — best streak tracked per wallet, shown on the leaderboard

## how it works

```
1. user picks heads/tails + amount → places flip on-chain
2. resolver crank reads the flip, submits a result hash
3. program checks parity, marks won or lost, escrows payout
4. user claims or doubles down
```

every flip = its own PDA (closed when resolved + claimed, rent refunded). vault holds house liquidity. stats PDA tracks per-player totals so the leaderboard reads from chain, not a database.

## stack

- **anchor 0.32** — single program, 8 instructions
- **vite + react 19** — dark/neon UI, Orbitron + Inter, raw CSS
- **socket.io** — live feed + leaderboard fanout from a node listener
- **helius** — devnet RPC + websocket subscriptions
- **switchboard VRF** — planned for prod resolver, devnet uses pseudo-random for now

## run

```bash
# 1. clone + install
npm i
cd app && npm i && cd ..

# 2. configure (copy .env.example → .env, fill in)
cp .env.example .env
# minimum: ANCHOR_WALLET, HELIUS_API_KEY, VITE_RPC_URL

# 3. build + deploy program
anchor build
anchor deploy

# 4. run the live-feed + resolver server
cd server && npm run dev

# 5. run the frontend
cd app && npm run dev
```

frontend lives on http://localhost:5173, ws server on `:3001`.

## env vars

| key | what |
|---|---|
| `ANCHOR_PROVIDER_URL` | rpc for the program-side cli |
| `ANCHOR_WALLET` | path to keypair signing flips during local tests |
| `PROGRAM_ID` | deployed program id (devnet default already in source) |
| `HELIUS_API_KEY` | helius key for ws subscriptions |
| `HELIUS_WS_URL` | helius websocket endpoint |
| `VITE_RPC_URL` | rpc the frontend hits (devnet helius recommended) |
| `VITE_PROGRAM_ID` | program id mirrored to vite |
| `VITE_WS_URL` | ws server url for live feed |
| `WS_PORT` | port the ws server binds to |

## tests

```bash
anchor test
```

22 tests cover place/resolve/claim/double, vault funding, pause toggle, house edge math, and edge cases (under min bet, double payout guard, stale PDA).

## disclaimer

⚠️ **devnet only.** play money, fake SOL. nothing here is mainnet-deployed.

⚠️ **gambling involves risk.** even at 1.9x payout the long-run expected value is negative for the player. don't bet what you can't lose. this code is open-source for educational and research purposes — no warranty.

## license

MIT
