import type { PlayerInfo } from '../hooks/useFlip'

type Props = {
  stats: PlayerInfo | null
}

export default function StatsBar({ stats }: Props) {
  if (!stats) return null

  const net = stats.totalWon - stats.totalLost

  return (
    <div className="stats-bar">
      <div className="stat">
        <span className="stat-val">{stats.totalFlips}</span>
        <span className="stat-label">flips</span>
      </div>
      <div className="stat">
        <span className={`stat-val ${net >= 0 ? 'pos' : 'neg'}`}>
          {net >= 0 ? '+' : ''}{net.toFixed(2)}
        </span>
        <span className="stat-label">net SOL</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stats.bestStreak}</span>
        <span className="stat-label">best streak</span>
      </div>
      <div className="stat">
        <span className="stat-val">{stats.volume.toFixed(1)}</span>
        <span className="stat-label">volume</span>
      </div>
    </div>
  )
}
