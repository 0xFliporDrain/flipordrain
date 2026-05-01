# changelog

## phase 5.7 — design overhaul + polish drops

- 🎨 dark/neon theme refresh — orbitron + inter, neon green/red accents, animated bg gradient
- 🎰 coin 3-state choreography — idle wobble, spin during waiting, settle on result
- ✨ confetti + screen-shake on win/lose, win-flash overlay, lose-flash subtle red
- 📡 live feed with fake/real flip mixer — degens see action even on slow days
- 🏆 leaderboard with positive-only filter — only winners on the board
- 🔥 streak meter — best streak per wallet, gold crown on top spot
- 🛟 demo mode — practice flips without a real wallet/sol
- ⏱️ tx timeout fixes — wallet rejections + vrf timeouts surface as friendly toasts
- 🛡️ crash guard around the play area so a render bug doesn't nuke the whole app

## phase 5 — vault + backend + frontend

- 🎰 anchor program — 8 instructions, vault pda, per-flip pda, stats pda
- 🛰️ ws server — node + socket.io, helius subs, fanout to feed + leaderboard
- 🪙 vite/react frontend — wallet adapter, flip card, result panel, history tab
- 📊 stats bar — vault liquidity, total flips, win rate from chain
