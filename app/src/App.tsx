import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from './components/Header'
import FlipCard from './components/FlipCard'
import CoinFlip from './components/CoinFlip'
import ResultPanel from './components/ResultPanel'
import StatsBar from './components/StatsBar'
import LiveFeed from './components/LiveFeed'
import Leaderboard from './components/Leaderboard'
import TransactionHistory from './components/TransactionHistory'
import ErrorToast from './components/ErrorToast'
import { useFlip } from './hooks/useFlip'
import { useSocket } from './hooks/useSocket'

type Tab = 'play' | 'history'

export default function App() {
  const { connected, connecting } = useWallet()
  const [tab, setTab] = useState<Tab>('play')
  const {
    state,
    result,
    vault,
    stats,
    balance,
    loading,
    error,
    history,
    placeFlip,
    claimWinnings,
    doubleOrNothing,
    reset,
    dismissError,
  } = useFlip()

  const { feed, leaders, connected: wsConnected } = useSocket()

  return (
    <div className="app">
      <Header balance={balance} stats={stats} loading={loading} connecting={connecting} />

      <nav className="tabs">
        <button
          className={`tab ${tab === 'play' ? 'active' : ''}`}
          onClick={() => setTab('play')}
        >
          play
        </button>
        <button
          className={`tab ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          history
          {history.length > 0 && <span className="tab-count">{history.length}</span>}
        </button>
      </nav>

      <main className="main">
        {tab === 'play' ? (
          <>
            {loading && !vault ? (
              <section className="play-area">
                <div className="loader-wrap">
                  <div className="loader-ring" />
                  <p className="loader-text">loading vault...</p>
                </div>
              </section>
            ) : connecting ? (
              <section className="play-area">
                <div className="loader-wrap">
                  <div className="loader-ring" />
                  <p className="loader-text">connecting wallet...</p>
                </div>
              </section>
            ) : (
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
            )}

            <StatsBar stats={stats} loading={loading && connected} />

            <section className="bottom-grid">
              <LiveFeed feed={feed} connected={wsConnected} />
              <Leaderboard leaders={leaders} />
            </section>
          </>
        ) : (
          <TransactionHistory history={history} />
        )}
      </main>

      {error && <ErrorToast error={error} onDismiss={dismissError} />}

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
