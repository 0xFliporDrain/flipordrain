import { FlipEvent, PlayerEntry } from './types'

// in-memory leaderboard, sorted by bestStreak desc
const board: Map<string, PlayerEntry> = new Map()

export function updateBoard(evt: FlipEvent) {
  let p = board.get(evt.player)
  if (!p) {
    p = {
      player: evt.player,
      flips: 0,
      won: 0,
      lost: 0,
      volume: 0,
      bestStreak: 0,
      currentStreak: 0,
    }
  }

  p.flips++
  p.volume += evt.amt || evt.payout
  if (evt.won) {
    p.won += evt.payout
    p.currentStreak++
    if (p.currentStreak > p.bestStreak) p.bestStreak = p.currentStreak
  } else {
    p.lost += evt.amt
    p.currentStreak = 0
  }

  board.set(evt.player, p)
}

export function getTop(n = 20): PlayerEntry[] {
  return [...board.values()]
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, n)
}

export function getPlayer(addr: string): PlayerEntry | undefined {
  return board.get(addr)
}
