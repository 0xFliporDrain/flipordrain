import type { PlayerInfo, VaultInfo } from '../hooks/useFlip'
import StreakMeter from './StreakMeter'

type Props = {
  stats: PlayerInfo | null
  vault: VaultInfo | null
  loading?: boolean
}

export default function StatsBar({ stats, vault, loading }: Props) {
  if (loading && !stats && !vault) {
    return (
      <div className="stats-bar">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="stat">
            <span className="stat-val shimmer">--</span>
            <span className="stat-label shimmer">---</span>
          </div>
        ))}
      </div>
    )
  }

  const net = stats ? stats.totalWon - stats.totalLost : 0

  return (
    <div className="stats-bar fade-in">
      {vault && (
        <div className="stat">
          <span className="stat-val">{vault.balance.toFixed(1)}</span>
          <span className="stat-label">vault SOL</span>
        </div>
      )}
      <div className="stat">
        <span className="stat-val">{stats ? stats.totalFlips : vault?.totalFlips || 0}</span>
        <span className="stat-label">flips</span>
      </div>
      {stats && (
        <div className="stat">
          <span className={`stat-val ${net >= 0 ? 'pos' : 'neg'}`}>
            {net >= 0 ? '+' : ''}{net.toFixed(2)}
          </span>
          <span className="stat-label">net SOL</span>
        </div>
      )}
      {stats && (
        <div className="stat">
          <span className="stat-val">{stats.bestStreak}</span>
          <span className="stat-label">best streak</span>
        </div>
      )}
      {stats && stats.currentStreak > 0 && <StreakMeter streak={stats.currentStreak} />}
      <div className="stat">
        <span className="stat-val">{stats ? stats.volume.toFixed(1) : vault?.totalVolume.toFixed(1) || '0'}</span>
        <span className="stat-label">volume</span>
      </div>
    </div>
  )
}
