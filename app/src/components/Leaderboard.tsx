import type { LeaderEntry } from '../hooks/useSocket'

type Props = {
  leaders: LeaderEntry[]
}

export default function Leaderboard({ leaders }: Props) {
  const visible = leaders.filter(l => l.won > l.lost).slice(0, 10)

  return (
    <div className="leaderboard">
      <h3>top degens today</h3>
      {visible.length === 0 ? (
        <p className="lb-empty">no players yet</p>
      ) : (
        <table className="lb-table">
          <thead>
            <tr>
              <th>#</th>
              <th>player</th>
              <th>flips</th>
              <th>streak</th>
              <th>net</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((l, i) => {
              const net = (l.won - l.lost) / 1e9
              return (
                <tr key={l.player + i} className={i === 0 ? 'lb-top' : ''}>
                  <td className="lb-rank">{i === 0 ? '👑' : i + 1}</td>
                  <td className="lb-player">{l.player}</td>
                  <td>{l.flips}</td>
                  <td className="lb-streak">{l.bestStreak}</td>
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
