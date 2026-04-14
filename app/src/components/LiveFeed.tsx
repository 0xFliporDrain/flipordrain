import { useState, useEffect, useRef } from 'react'
import type { LiveFlip } from '../hooks/useSocket'

type Props = {
  feed: LiveFlip[]
  connected: boolean
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 8) return addr || '???'
  if (addr.includes('...')) return addr
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

function timeAgo(ts: number, now: number) {
  const s = Math.max(0, Math.floor((now - ts) / 1000))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

// stable id from flip data
function flipId(f: LiveFlip, i: number) {
  return `${f.tx}-${f.ts}-${f.player}-${i}`
}

export default function LiveFeed({ feed, connected }: Props) {
  const [now, setNow] = useState(Date.now())
  const [items, setItems] = useState<(LiveFlip & { id: string, fresh: boolean })[]>([])
  const prevLen = useRef(0)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // when feed changes, mark new items as fresh
  useEffect(() => {
    const visible = feed.slice(0, 10)
    const newCount = Math.max(0, visible.length - prevLen.current)
    prevLen.current = visible.length

    const mapped = visible.map((f, i) => ({
      ...f,
      id: flipId(f, i),
      fresh: i < newCount,
    }))
    setItems(mapped)

    // remove fresh flag after animation
    if (newCount > 0) {
      const t = setTimeout(() => {
        setItems(prev => prev.map(it => ({ ...it, fresh: false })))
      }, 500)
      return () => clearTimeout(t)
    }
  }, [feed])

  return (
    <div className="live-feed">
      <h3>
        live feed{' '}
        <span className={`dot ${connected ? 'on' : 'off'}`} />
        {connected && <span className="live-badge">LIVE</span>}
      </h3>
      {items.length === 0 ? (
        <p className="feed-empty">no flips yet...</p>
      ) : (
        <div className="feed-scroll">
          <div className="feed-header">
            <span>player</span>
            <span>result</span>
            <span>time</span>
          </div>
          {items.map((f) => (
            <div
              key={f.id}
              className={`feed-row ${f.won ? 'feed-win' : 'feed-lose'} ${f.fresh ? 'feed-new' : ''}`}
            >
              <span className="feed-player">{shortAddr(f.player)}</span>
              <span className={`feed-result ${f.won ? 'w' : 'l'}`}>
                {f.won ? `+${(f.payout / 1e9).toFixed(2)}` : `-${(f.amt / 1e9).toFixed(2)}`}
              </span>
              <span className="feed-time">{timeAgo(f.ts, now)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
