import { PublicKey } from '@solana/web3.js'

export const PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PROGRAM_ID || '8SXWVRBFoPCqbLZiDA9oY9EFbD9NVbU7SryoxJQt3ssG'
)

export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://api.devnet.solana.com'

export const WS_URL =
  import.meta.env.VITE_WS_URL || 'http://localhost:3001'

export const VAULT_SEED = new TextEncoder().encode('vault')
export const FLIP_SEED = new TextEncoder().encode('flip')
export const STATS_SEED = new TextEncoder().encode('stats')

export const LAMPORTS = 1_000_000_000
export const PAYOUT_MULTIPLIER = 1.9

export const BET_PRESETS = [0.05, 0.1, 0.25, 0.5, 1, 2]
