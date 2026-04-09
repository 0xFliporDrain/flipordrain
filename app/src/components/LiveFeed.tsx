import type { LiveFlip } from '../hooks/useSocket'

type Props = {
  feed: LiveFlip[]
  connected: boolean
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 8) return addr || '???'
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function LiveFeed({ feed, connected }: Props) {
  return (
    <div className="live-feed">
      <h3>
        live feed{' '}
        <span className={`dot ${connected ? 'on' : 'off'}`} />
      </h3>
      {feed.length === 0 ? (
        <p className="feed-empty">no flips yet...</p>
      ) : (
        <ul className="feed-list">
          {feed.slice(0, 20).map((f, i) => (
            <li key={`${f.tx}-${i}`} className={f.won ? 'feed-win' : 'feed-lose'}>
              <span className="feed-player">{shortAddr(f.player)}</span>
              <span className={`feed-result ${f.won ? 'w' : 'l'}`}>
                {f.won ? `+${(f.payout / 1e9).toFixed(2)}` : `-${(f.amt / 1e9).toFixed(2)}`}
              </span>
              <span className="feed-time">{timeAgo(f.ts)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
