import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { AnchorProvider, Program, Wallet, BN } from '@coral-xyz/anchor'
import * as fs from 'fs'
import * as path from 'path'

const PROGRAM_ID = new PublicKey(
  process.env.PROGRAM_ID || '8SXWVRBFoPCqbLZiDA9oY9EFbD9NVbU7SryoxJQt3ssG'
)
const RPC_URL = process.env.ANCHOR_PROVIDER_URL || 'https://api.devnet.solana.com'
const WALLET_PATH = process.env.ANCHOR_WALLET || `${process.env.HOME}/.config/solana/id.json`
const POLL_INTERVAL = parseInt(process.env.RESOLVER_INTERVAL || '3000')

function loadWallet(): Keypair {
  const raw = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'))
  return Keypair.fromSecretKey(Uint8Array.from(raw))
}

function randomResult(): number[] {
  const r = new Array(32).fill(0)
  for (let i = 0; i < 32; i++) r[i] = Math.floor(Math.random() * 256)
  return r
}

async function main() {
  const conn = new Connection(RPC_URL, 'confirmed')
  const kp = loadWallet()
  const wallet = new Wallet(kp)
  const provider = new AnchorProvider(conn, wallet, { commitment: 'confirmed' })

  const idlPath = path.resolve(__dirname, '../../target/idl/flipordrain.json')
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'))
  const program = new Program(idl, provider)

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    PROGRAM_ID
  )

  console.log(`resolver started — polling every ${POLL_INTERVAL}ms`)
  console.log(`program: ${PROGRAM_ID}`)
  console.log(`resolver: ${kp.publicKey}`)

  async function poll() {
    try {
      const flips = await program.account.flipGame.all()
      const pending = flips.filter((f: any) => f.account.result === null)

      if (pending.length === 0) return

      console.log(`found ${pending.length} pending flip(s)`)

      for (const f of pending) {
        const player = (f.account as any).player as PublicKey
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
              player: player,
              resolver: kp.publicKey,
            })
            .rpc()

          console.log(
            `resolved ${f.publicKey.toString().slice(0, 8)}.. → ${won ? 'WIN' : 'LOSS'} (tx: ${tx.slice(0, 12)}..)`
          )
        } catch (e: any) {
          console.error(`failed to resolve ${f.publicKey}: ${e.message}`)
        }
      }
    } catch (e: any) {
      if (!e.message.includes('Account does not exist')) {
        console.error('poll error:', e.message)
      }
    }
  }

  setInterval(poll, POLL_INTERVAL)
  poll()
}

main()
