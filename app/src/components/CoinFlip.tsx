import type { FlipState } from '../hooks/useFlip'

type Props = {
  state: FlipState
}

export default function CoinFlip({ state }: Props) {
  const spinning = state === 'placing' || state === 'waiting'
  const won = state === 'won'
  const lost = state === 'lost'

  return (
    <div className="coin-wrap">
      <div
        className={`coin ${spinning ? 'spinning' : ''} ${won ? 'win' : ''} ${lost ? 'lose' : ''}`}
      >
        <div className="coin-face coin-heads">
          <span>W</span>
        </div>
        <div className="coin-face coin-tails">
          <span>L</span>
        </div>
      </div>
    </div>
  )
}
