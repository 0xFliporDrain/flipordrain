import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import type { PlayerInfo } from '../hooks/useFlip'

type Props = {
  balance: number
  stats: PlayerInfo | null
  loading?: boolean
  connecting?: boolean
}

export default function Header({ balance, stats, loading, connecting }: Props) {
  const { connected } = useWallet()

  return (
    <header className="hdr">
      <div className="hdr-left">
        <h1 className="logo">
          FLIP<span className="accent">OR</span>DRAIN
        </h1>
      </div>
      <div className="hdr-right">
        {connecting ? (
          <div className="hdr-stats">
            <span className="hdr-bal shimmer">---</span>
          </div>
        ) : connected ? (
          <div className="hdr-stats">
            <span className={`hdr-bal ${loading ? 'shimmer' : ''}`}>
              {balance.toFixed(2)} SOL
            </span>
            {stats && (
              <span className="hdr-streak" title="Current streak">
                {stats.currentStreak > 0
                  ? `${'🔥'.repeat(Math.min(stats.currentStreak, 5))} ${stats.currentStreak}`
                  : '—'}
              </span>
            )}
          </div>
        ) : null}
        <WalletMultiButton />
      </div>
    </header>
  )
}
