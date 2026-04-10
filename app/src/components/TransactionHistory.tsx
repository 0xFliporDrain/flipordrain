import { useState } from 'react'
import type { FlipRecord } from '../hooks/useFlip'

type Props = {
  history: FlipRecord[]
}

type SortKey = 'time' | 'amount' | 'payout'
type FilterKey = 'all' | 'won' | 'lost'

function formatTime(ts: number) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = Math.floor((now - ts) / 1000)

  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TransactionHistory({ history }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [sort, setSort] = useState<SortKey>('time')

  const filtered = history.filter((h) => {
    if (filter === 'won') return h.won
    if (filter === 'lost') return !h.won
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'time') return b.ts - a.ts
    if (sort === 'amount') return b.amount - a.amount
    return (b.won ? b.payout : 0) - (a.won ? a.payout : 0)
  })

  const totalWon = history.filter((h) => h.won).length
  const totalLost = history.filter((h) => !h.won).length
  const netSol = history.reduce(
    (sum, h) => sum + (h.won ? h.payout - h.amount : -h.amount),
    0
  )

  return (
    <div className="tx-history">
      <div className="tx-header">
        <h3>transaction history</h3>
        <div className="tx-summary">
          <span className="tx-stat">
            <span className="pos">{totalWon}W</span>
            <span className="tx-sep">/</span>
            <span className="neg">{totalLost}L</span>
          </span>
          <span className={`tx-net ${netSol >= 0 ? 'pos' : 'neg'}`}>
            {netSol >= 0 ? '+' : ''}{netSol.toFixed(4)} SOL
          </span>
        </div>
      </div>

      <div className="tx-controls">
        <div className="tx-filters">
          {(['all', 'won', 'lost'] as FilterKey[]).map((f) => (
            <button
              key={f}
              className={`tx-filter ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <select
          className="tx-sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          <option value="time">newest</option>
          <option value="amount">biggest bet</option>
          <option value="payout">biggest win</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <div className="tx-empty">
          {filter === 'all'
            ? 'no flips yet — start playing!'
            : `no ${filter} flips`}
        </div>
      ) : (
        <ul className="tx-list">
          {sorted.map((h, i) => (
            <li key={`${h.ts}-${i}`} className={`tx-row ${h.won ? 'tx-win' : 'tx-loss'}`}>
              <div className="tx-row-left">
                <span className={`tx-badge ${h.won ? 'badge-win' : 'badge-loss'}`}>
                  {h.won ? 'W' : 'L'}
                </span>
                <div className="tx-details">
                  <span className="tx-bet">{h.amount.toFixed(4)} SOL</span>
                  {h.isDouble && <span className="tx-tag">2x</span>}
                </div>
              </div>
              <div className="tx-row-right">
                <span className={h.won ? 'pos' : 'neg'}>
                  {h.won ? `+${h.payout.toFixed(4)}` : `-${h.amount.toFixed(4)}`}
                </span>
                <span className="tx-time">{formatTime(h.ts)}</span>
                {h.sig && (
                  <a
                    className="tx-link"
                    href={`https://explorer.solana.com/tx/${h.sig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on Explorer"
                  >
                    &rarr;
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
