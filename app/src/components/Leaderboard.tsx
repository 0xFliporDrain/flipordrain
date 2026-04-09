import type { LeaderEntry } from '../hooks/useSocket'

type Props = {
  leaders: LeaderEntry[]
}

function shortAddr(addr: string) {
  if (!addr || addr.length < 8) return addr || '???'
  return addr.slice(0, 4) + '...' + addr.slice(-4)
}

export default function Leaderboard({ leaders }: Props) {
  return (
    <div className="leaderboard">
      <h3>leaderboard</h3>
      {leaders.length === 0 ? (
        <p className="lb-empty">no players yet</p>
      ) : (
        <table className="lb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>player</th>
              <th>flips</th>
              <th>streak</th>
              <th>volume</th>
              <th>net</th>
            </tr>
          </thead>
          <tbody>
            {leaders.map((l, i) => {
              const net = (l.won - l.lost) / 1e9
              return (
                <tr key={l.player}>
                  <td className="lb-rank">{i + 1}</td>
                  <td className="lb-player">{shortAddr(l.player)}</td>
                  <td>{l.flips}</td>
                  <td className="lb-streak">{l.bestStreak}</td>
                  <td>{(l.volume / 1e9).toFixed(1)}</td>
                  <td className={net >= 0 ? 'pos' : 'neg'}>
                    {net >= 0 ? '+' : ''}{net.toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
