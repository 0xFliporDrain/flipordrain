import { Connection, PublicKey } from '@solana/web3.js'
import { FlipEvent } from './types'

const PROGRAM_ID = process.env.PROGRAM_ID || ''

// parse flip events from tx logs
export function parseFlipLog(logs: string[], sig: string): FlipEvent | null {
  for (const log of logs) {
    // match our msg! patterns from resolve_flip
    if (log.includes('flip won!')) {
      const payoutMatch = log.match(/payout: (\d+)/)
      return {
        player: '', // filled from tx accounts
        amt: 0,
        won: true,
        payout: payoutMatch ? parseInt(payoutMatch[1]) : 0,
        streak: 0,
        tx: sig,
        ts: Date.now(),
      }
    }
    if (log.includes('flip lost')) {
      const amtMatch = log.match(/(\d+) lamports/)
      return {
        player: '',
        amt: amtMatch ? parseInt(amtMatch[1]) : 0,
        won: false,
        payout: 0,
        streak: 0,
        tx: sig,
        ts: Date.now(),
      }
    }
  }
  return null
}

// subscribe to program logs via ws
export function startListener(
  rpcUrl: string,
  onFlip: (evt: FlipEvent) => void
) {
  if (!PROGRAM_ID) {
    console.log('no PROGRAM_ID, skipping listener')
    return
  }

  const conn = new Connection(rpcUrl, 'confirmed')
  const pid = new PublicKey(PROGRAM_ID)

  console.log('listening for flips on', PROGRAM_ID)

  conn.onLogs(pid, (logInfo) => {
    if (logInfo.err) return
    const evt = parseFlipLog(logInfo.logs, logInfo.signature)
    if (evt) onFlip(evt)
  })
}
