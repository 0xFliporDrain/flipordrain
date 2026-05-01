# troubleshooting

quick fixes for the most common stumbles when running the flip locally.

## phantom is on mainnet

settings → developer → testnet/devnet enabled. then disconnect + reconnect to flipordrain — the site should auto-prompt phantom to switch.

## "transaction simulation failed"

most often it's vault rent. open the console:

```js
fetch('/api/vault').then(r => r.json()).then(console.log)
```

if the vault balance < 0.5 SOL, top it up via `npm run topup`.

## ws drops every 30s

dev-server proxy timeout. set `vite.config.ts → server.proxy['/ws'].timeout = 0` and restart.

## leaderboard says "no flips"

the indexer is one minute behind on first boot. wait 60s — or kick it manually:

```bash
cd indexer && npm run reseed
```

## flip animation jerks on safari

safari < 16 doesn't honor `transform-style: preserve-3d` on hardware-accelerated layers. add `-webkit-transform-style: preserve-3d` in `app/src/index.css` for `.coin`.

## tx times out at 60s

devnet RPC latency. switch to helius:

```
VITE_RPC_URL=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

## still stuck?

drop a note in the github issue tracker with `solana logs --url devnet --program <PROGRAM_ID>` output and we'll dig in.
