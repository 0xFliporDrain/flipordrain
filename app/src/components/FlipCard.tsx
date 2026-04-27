import { useRef, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { BET_PRESETS } from '../lib/constants'
import type { FlipState, VaultInfo } from '../hooks/useFlip'

type Props = {
  state: FlipState
  vault: VaultInfo | null
  balance: number
  onFlip: (amount: number) => void
  onDemo: (amount: number) => void
}

const FLIP_DEBOUNCE_MS = 300

export default function FlipCard({ state, vault, balance, onFlip, onDemo }: Props) {
  const { connected } = useWallet()
  const [amount, setAmount] = useState(0.1)
  const [err, setErr] = useState('')
  const lastClickRef = useRef(0)

  const handleFlip = () => {
    const now = Date.now()
    if (now - lastClickRef.current < FLIP_DEBOUNCE_MS) return
    lastClickRef.current = now
    setErr('')
    if (!vault) {
      setErr('vault not loaded')
      return
    }
    if (vault.isPaused) {
      setErr('game is paused')
      return
    }
    if (amount < vault.minBet) {
      setErr(`min bet: ${vault.minBet} SOL`)
      return
    }
    if (amount > vault.maxBet) {
      setErr(`max bet: ${vault.maxBet} SOL`)
      return
    }
    if (amount > balance) {
      setErr('insufficient balance')
      return
    }
    if (amount * 1.9 > vault.balance) {
      setErr('vault cant cover payout')
      return
    }
    onFlip(amount)
  }

  const busy = state === 'placing' || state === 'waiting'

  return (
    <div className="flip-card">
      <div className="flip-card-inner">
        <p className="flip-label">wager amount</p>
        <div className="bet-presets">
          {BET_PRESETS.map((p) => (
            <button
              key={p}
              className={`preset ${amount === p ? 'active' : ''}`}
              onClick={() => { setAmount(p); setErr('') }}
              disabled={busy}
            >
              {p} SOL
            </button>
          ))}
        </div>
        <div className="bet-custom">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => { setAmount(parseFloat(e.target.value) || 0); setErr('') }}
            disabled={busy}
          />
          <span className="unit">SOL</span>
        </div>
        <div className="payout-info">
          win → <span className="accent">{(amount * 1.9).toFixed(4)} SOL</span>
        </div>

        {!connected ? (
          <p className="hint">connect wallet to play</p>
        ) : (
          <button
            className={`flip-btn ${busy ? 'busy' : ''}`}
            onClick={handleFlip}
            disabled={busy || !vault}
          >
            {state === 'placing'
              ? 'SIGNING...'
              : state === 'waiting'
              ? 'FLIPPING...'
              : 'FLIP'}
          </button>
        )}
        <button
          className="demo-btn"
          onClick={() => onDemo(amount)}
          disabled={busy}
        >
          DEMO FLIP
        </button>

        {err && <p className="flip-err">{err}</p>}
      </div>

    </div>
  )
}
