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
