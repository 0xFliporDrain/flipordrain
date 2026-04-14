import type { FlipState } from '../hooks/useFlip'

type Props = {
  state: FlipState
}

export default function CoinFlip({ state }: Props) {
  const spinning = state === 'placing' || state === 'waiting'
  const won = state === 'won'
  const lost = state === 'lost'
  const idle = state === 'idle'
  const resolved = won || lost

  return (
    <div className={`coin-wrap ${spinning ? 'spinning-glow' : ''}`}>
      <div
        className={`coin ${spinning ? 'spinning' : ''} ${won ? 'win' : ''} ${lost ? 'lose' : ''}`}
      >
        {resolved ? (
          /* after resolve — single face, no 3D flip needed */
          <div className={`coin-face ${won ? 'coin-heads' : 'coin-tails'}`} style={{ backfaceVisibility: 'visible' }}>
            <span className={`coin-txt-result ${won ? 'coin-check' : 'coin-cross'}`}>
              {won ? '✓' : '✕'}
            </span>
          </div>
        ) : (
          /* idle + spinning — two-sided coin */
          <>
            <div className="coin-face coin-heads">
              {idle && <span className="coin-txt-idle">GOOD<br/>LUCK</span>}
              {spinning && <span className="coin-txt-result coin-check">✓</span>}
            </div>
            <div className="coin-face coin-tails">
              {idle && <span className="coin-txt-idle">GOOD<br/>LUCK</span>}
              {spinning && <span className="coin-txt-result coin-cross">✕</span>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
