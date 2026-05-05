import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor'
import * as fs from 'fs'
import idl from './idl.json'

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '2JLBJ794NCQAwmqKVmcKjcKYmPkCfpXwxpRvDo4BWdh3'
)
const RPC_URL = process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com'
const POLL_INTERVAL = parseInt(process.env.RESOLVER_INTERVAL || '3000')

function parseSecretKey(raw: string): number[] | null {
  const trimmed = raw.trim()
  // Try strict JSON first
  try {
    const arr = JSON.parse(trimmed)
    if (Array.isArray(arr)) return arr
  } catch {}
  // Try as bare comma-separated digits (no enclosing brackets)
  const inner = trimmed.replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '')
  const nums = inner.split(/[,\s]+/).filter(Boolean).map(Number)
  if (nums.length >= 32 && nums.every((n) => Number.isFinite(n) && n >= 0 && n <= 255)) {
    return nums
  }
  return null
}

function loadKeypair(): Keypair | null {
  // Prefer env var (Railway, Vercel — anywhere without a real filesystem identity)
  const envKey = process.env.RESOLVER_KEYPAIR
  if (envKey) {
    const arr = parseSecretKey(envKey)
    if (!arr) {
      console.error('RESOLVER_KEYPAIR is set but malformed (expected JSON array of bytes or comma-separated digits)')
      return null
    }
    try {
      return Keypair.fromSecretKey(Uint8Array.from(arr))
    } catch (e: any) {
      console.error('RESOLVER_KEYPAIR parsed but rejected by Keypair.fromSecretKey:', e.message)
      return null
    }
  }
  // Fall back to a file path for local dev
  const walletPath = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`
  if (!fs.existsSync(walletPath)) return null
  try {
    const raw = JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
    return Keypair.fromSecretKey(Uint8Array.from(raw))
  } catch (e: any) {
    console.error('failed to load wallet at', walletPath, ':', e.message)
    return null
  }
}

function randomResult(): number[] {
  const r = new Array(32).fill(0)
  for (let i = 0; i < 32; i++) r[i] = Math.floor(Math.random() * 256)
  return r
}

export function startResolver(): void {
  const kpOrNull = loadKeypair()
  if (!kpOrNull) {
    console.warn('resolver: no keypair available (set RESOLVER_KEYPAIR env or ANCHOR_WALLET path) — skipping')
    return
  }
  const kp: Keypair = kpOrNull

  const conn = new Connection(RPC_URL, 'confirmed')
  const wallet = new Wallet(kp)
  const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' })
  const program = new Program(idl as any, provider)

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  )

  console.log(`resolver started — polling every ${POLL_INTERVAL}ms`)
  console.log(`program: ${PROGRAM_ID.toString()}`)
  console.log(`resolver pubkey: ${kp.publicKey.toString()}`)

  async function poll() {
    try {
      const flips = await (program.account as any).flipGame.all()
      const pending = flips.filter((f: any) => f.account.result === null)
      if (pending.length === 0) return

      console.log(`found ${pending.length} pending flip(s)`)
      for (const f of pending) {
        const player = f.account.player as PublicKey
        const [statsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stats'), player.toBuffer()],
          PROGRAM_ID
        )
        const result = randomResult()
        const won = result[0] % 2 === 0
        try {
          const tx = await program.methods
            .resolveFlip(result)
            .accountsPartial({
              vault: vaultPda,
              flipGame: f.publicKey,
              playerStats: statsPda,
              player,
              resolver: kp.publicKey,
            })
            .rpc()
          console.log(
            `resolved ${f.publicKey.toString().slice(0, 8)}.. → ${won ? 'WIN' : 'LOSS'} (tx: ${tx.slice(0, 12)}..)`
          )
        } catch (e: any) {
          console.error(`failed to resolve ${f.publicKey.toString().slice(0, 8)}..: ${e.message}`)
        }
      }
    } catch (e: any) {
      if (!String(e.message || '').includes('Account does not exist')) {
        console.error('poll error:', e.message)
      }
    }
  }

  setInterval(poll, POLL_INTERVAL)
  void poll()
}

// allow running standalone via `npm run resolver`
if (require.main === module) {
  startResolver()
}
