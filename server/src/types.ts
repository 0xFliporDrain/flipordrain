export type FlipEvent = {
  player: string
  amt: number
  won: boolean
  payout: number
  streak: number
  tx: string
  ts: number
}

export type PlayerEntry = {
  player: string
  flips: number
  won: number
  lost: number
  volume: number
  bestStreak: number
  currentStreak: number
}
