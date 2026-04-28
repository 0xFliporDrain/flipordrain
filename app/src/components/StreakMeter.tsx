// streak meter — read-only flair around stats.currentStreak.
// 0  → hidden, no clutter
// 1-2 → cool spark, no glow
// 3-4 → flame on
// 5-6 → flame + ring pulse
// 7+ → flame + ring + "on fire" tag
type Props = { streak: number }

export default function StreakMeter({ streak }: Props) {
  if (streak <= 0) return null

  const tier = streak >= 7 ? 'inferno' : streak >= 5 ? 'blaze' : streak >= 3 ? 'hot' : 'spark'
  const icon = tier === 'spark' ? '⚡' : '🔥'

  return (
    <div className={`streak-meter tier-${tier}`} role="status" aria-label={`current streak ${streak}`}>
      <span className="streak-icon">{icon}</span>
      <span className="streak-num">{streak}</span>
      <span className="streak-tag">{tier === 'inferno' ? 'on fire' : tier === 'blaze' ? 'streak' : tier === 'hot' ? 'streak' : 'going'}</span>
    </div>
  )
}
