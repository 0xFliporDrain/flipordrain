import { useState, useEffect, useRef } from 'react'
import { PublicKey } from '@solana/web3.js'
import type { FlipResult, FlipState } from '../hooks/useFlip'

type Props = {
  state: FlipState
  result: FlipResult | null
  onClaim: () => void
  onDouble: () => void
  onReset: () => void
  onDemoAgain?: () => void
}

function AnimNum({ val, won }: { val: number, won: boolean }) {
  const [disp, setDisp] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    const dur = 800
    const start = performance.now()
    const from = 0
    const to = val

    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setDisp(from + (to - from) * ease)
      if (t < 1) ref.current = requestAnimationFrame(tick)
    }

    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [val])

  return (
    <span className="result-amount-num">
      {won ? '+' : '-'}{disp.toFixed(4)} SOL
    </span>
  )
}

export default function ResultPanel({
  state,
  result,
  onClaim,
  onDouble,
  onReset,
  onDemoAgain,
}: Props) {
  if (!result || state === 'idle' || state === 'placing') return null

  if (state === 'waiting') {
    return (
      <div className="result-panel waiting">
        <div className="result-spinner" />
        <p>waiting for result...</p>
      </div>
    )
  }

  const isDemo = result.flipPda.equals(PublicKey.default)

  const tweetWin = () => {
    const txt = `just won ${result.payout.toFixed(3)} SOL on @FlipOrDrain_app — 1.9x payout, 50/50 odds, all on-chain.\n\nflipping ${result.amount.toFixed(2)} → ${result.payout.toFixed(3)} 🎰`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(txt)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={`result-panel ${result.won ? 'win' : 'lose'}`}>
      {!result.won && <div className="lose-icon">💀</div>}
      <h2 className="result-title">
        {result.won ? 'YOU WON!' : 'DRAINED'}
      </h2>
      {isDemo ? (
        <p className="result-demo-tag">demo mode</p>
      ) : (
        <p className="result-amount">
          <AnimNum
            val={result.won ? result.payout : result.amount}
            won={result.won}
          />
        </p>
      )}

      {isDemo ? (
        <div className="result-actions">
          <button className="btn-claim" onClick={onDemoAgain}>
            DEMO FLIP AGAIN
          </button>
          <button className="btn-again" onClick={onReset}>
            ← BACK TO BET
          </button>
        </div>
      ) : result.won ? (
        <div className="result-actions">
          <button className="btn-claim" onClick={onClaim}>
            CLAIM {result.payout.toFixed(4)} SOL
          </button>
          {result.canDouble && (
            <button className="btn-double" onClick={onDouble}>
              DOUBLE OR NOTHING
            </button>
          )}
          <button className="btn-tweet" onClick={tweetWin} aria-label="share win on x">
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span>tweet win</span>
          </button>
        </div>
      ) : (
        <div className="result-actions">
          <button className="btn-again" onClick={onReset}>
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}
