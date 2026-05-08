import { useState, useEffect, useRef } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import Header from './components/Header'
import NetworkBanner from './components/NetworkBanner'
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
  const { connected, connecting, publicKey } = useWallet()
  const [tab, setTab] = useState<Tab>('play')
  const [fx, setFx] = useState<'win' | 'lose' | null>(null)
  const prevState = useRef<string>('idle')
  const lastDemoAmt = useRef(0.25)
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
    demoFlip,
    claimWinnings,
    doubleOrNothing,
    reset,
    dismissError,
  } = useFlip()

  const { feed, leaders, connected: wsConnected, addRealFlip } = useSocket()

  const resultRef = useRef(result)
  useEffect(() => { resultRef.current = result }, [result])

  const pkRef = useRef(publicKey)
  useEffect(() => { pkRef.current = publicKey }, [publicKey])

  const statsRef = useRef(stats)
  useEffect(() => { statsRef.current = stats }, [stats])

  const addRealFlipRef = useRef(addRealFlip)
  useEffect(() => { addRealFlipRef.current = addRealFlip }, [addRealFlip])

  useEffect(() => {
    if (prevState.current === 'waiting' && state === 'won') {
      setFx('win')
      setTimeout(() => setFx(null), 2500)
    }
    if (prevState.current === 'waiting' && state === 'lost') {
      setFx('lose')
      setTimeout(() => setFx(null), 600)
    }
    // inject real flip into live feed
    const r = resultRef.current
    const pk = pkRef.current
    if ((prevState.current === 'waiting') && (state === 'won' || state === 'lost') && r && pk) {
      addRealFlipRef.current({
        player: pk.toBase58(),
        amt: r.amount * 1e9,
        won: r.won,
        payout: r.won ? r.payout * 1e9 : 0,
        streak: statsRef.current?.currentStreak || 0,
        tx: '',
        ts: Date.now(),
      })
    }
    prevState.current = state
  }, [state])

  return (
    <>
      <div className="particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="particle" />
        ))}
      </div>

      {fx === 'win' && (
        <>
          <div className="win-flash" />
          <div className="confetti-wrap">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="confetti" />
            ))}
          </div>
        </>
      )}
      {fx === 'lose' && <div className="lose-flash" />}

      <div className={`app ${fx === 'lose' ? 'screen-shake' : ''}`}>
        <NetworkBanner />
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
            <div className="tab-content" key="play">
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
                      onDemo={(amt) => { lastDemoAmt.current = amt; demoFlip(amt) }}
                    />
                  )}

                  <ResultPanel
                    state={state}
                    result={result}
                    onClaim={() => result && claimWinnings(result.flipPda)}
                    onDouble={() => result && doubleOrNothing(result.flipPda)}
                    onReset={reset}
                    onDemoAgain={() => { reset(); setTimeout(() => demoFlip(lastDemoAmt.current), 50) }}
                  />
                </section>
              )}

              <StatsBar stats={stats} vault={vault} loading={loading && connected} />

              <section className="bottom-grid">
                <LiveFeed feed={feed} connected={wsConnected} />
                <Leaderboard leaders={leaders} loading={!wsConnected} />
              </section>
            </div>
          ) : (
            <div className="tab-content" key="history">
              <TransactionHistory history={history} />
            </div>
          )}
        </main>

        {error && <ErrorToast error={error} onDismiss={dismissError} />}

        <footer className="ftr">
          <span>on-chain coin flip</span>
          <span className="ftr-sep">|</span>
          <span>solana devnet</span>
          <span className="ftr-sep">|</span>
          <span>1.9x payout</span>
          <span className="ftr-sep">|</span>
          <span className="ftr-fine">devnet sol only — no real value, gambling carries risk</span>
        </footer>
      </div>
    </>
  )
}
