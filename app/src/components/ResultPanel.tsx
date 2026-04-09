import type { FlipResult, FlipState } from '../hooks/useFlip'

type Props = {
  state: FlipState
  result: FlipResult | null
  onClaim: () => void
  onDouble: () => void
  onReset: () => void
}

export default function ResultPanel({
  state,
  result,
  onClaim,
  onDouble,
  onReset,
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

  return (
    <div className={`result-panel ${result.won ? 'win' : 'lose'}`}>
      <h2 className="result-title">
        {result.won ? 'YOU WON!' : 'DRAINED'}
      </h2>
      <p className="result-amount">
        {result.won
          ? `+${result.payout.toFixed(4)} SOL`
          : `-${result.amount.toFixed(4)} SOL`}
      </p>

      {result.won && (
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
      )}

      {!result.won && (
        <div className="result-actions">
          <button className="btn-again" onClick={onReset}>
            TRY AGAIN
          </button>
        </div>
      )}
    </div>
  )
}
