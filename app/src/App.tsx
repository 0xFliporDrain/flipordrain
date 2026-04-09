import Header from './components/Header'
import FlipCard from './components/FlipCard'
import CoinFlip from './components/CoinFlip'
import ResultPanel from './components/ResultPanel'
import StatsBar from './components/StatsBar'
import LiveFeed from './components/LiveFeed'
import Leaderboard from './components/Leaderboard'
import { useFlip } from './hooks/useFlip'
import { useSocket } from './hooks/useSocket'

export default function App() {
  const {
    state,
    result,
    vault,
    stats,
    balance,
    placeFlip,
    claimWinnings,
    doubleOrNothing,
    reset,
  } = useFlip()

  const { feed, leaders, connected } = useSocket()

  return (
    <div className="app">
      <Header balance={balance} stats={stats} />

      <main className="main">
        <section className="play-area">
          <CoinFlip state={state} />

          {(state === 'idle' || state === 'placing') && (
            <FlipCard
              state={state}
              vault={vault}
              balance={balance}
              onFlip={placeFlip}
            />
          )}

          <ResultPanel
            state={state}
            result={result}
            onClaim={() => result && claimWinnings(result.flipPda)}
            onDouble={() => result && doubleOrNothing(result.flipPda)}
            onReset={reset}
          />
        </section>

        <StatsBar stats={stats} />

        <section className="bottom-grid">
          <LiveFeed feed={feed} connected={connected} />
          <Leaderboard leaders={leaders} />
        </section>
      </main>

      <footer className="ftr">
        <span>on-chain coin flip</span>
        <span className="ftr-sep">|</span>
        <span>solana devnet</span>
        <span className="ftr-sep">|</span>
        <span>1.9x payout</span>
      </footer>
    </div>
  )
}
