import type { LeaderEntry } from '../hooks/useSocket'

type Props = {
  leaders: LeaderEntry[]
  loading?: boolean
}

export default function Leaderboard({ leaders, loading = false }: Props) {
  const visible = leaders.filter(l => l.won > l.lost).slice(0, 10)

  return (
    <div className="leaderboard">
      <h3>top degens today</h3>
      {loading && visible.length === 0 ? (
        <ul className="lb-skeleton" aria-hidden>
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="lb-skel-row">
              <span className="lb-skel-bar lb-skel-rank" />
              <span className="lb-skel-bar lb-skel-name" />
              <span className="lb-skel-bar lb-skel-num" />
            </li>
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <p className="lb-empty">no players yet — be the first to print on the board</p>
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
