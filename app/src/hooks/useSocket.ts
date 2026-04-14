import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { WS_URL } from '../lib/constants'

export type LiveFlip = {
  player: string
  amt: number
  won: boolean
  payout: number
  streak: number
  tx: string
  ts: number
}

export type LeaderEntry = {
  player: string
  flips: number
  won: number
  lost: number
  volume: number
  bestStreak: number
  currentStreak: number
}

// fake wallet addresses — realistic base58
const FAKE_WALLETS = [
  'Dge4...xR7k', '7mYp...a3Wq', 'Bkz8...nT5v', 'Hx3Q...fJ9m',
  'Kw6R...gU2s', '4nFp...bY8e', 'Qs9A...mD4c', 'Vt2L...hN7w',
  'Jc5E...rK6z', '8gWb...pX3f', 'Nv7M...qA9t', 'Rx4C...sG2j',
  'Yz1H...uB5d', '3kTn...wF8a', 'Lm6V...xP4i', 'Ew9S...vQ7o',
]

const BET_AMTS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.5, 0.75, 1, 1.5, 2]

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fakeTx() {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
  let s = ''
  for (let i = 0; i < 12; i++) s += c[Math.floor(Math.random() * c.length)]
  return s
}

function genFakeFlip(): LiveFlip {
  const amt = pick(BET_AMTS)
  const won = Math.random() < 0.45
  return {
    player: pick(FAKE_WALLETS),
    amt: amt * 1e9,
    won,
    payout: won ? amt * 1.9 * 1e9 : 0,
    streak: won ? Math.floor(Math.random() * 5) + 1 : 0,
    tx: fakeTx(),
    ts: Date.now() - Math.floor(Math.random() * 5000),
  }
}

function genFakeLeaders(): LeaderEntry[] {
  const entries: LeaderEntry[] = FAKE_WALLETS.slice(0, 10).map((w) => {
    const flips = Math.floor(Math.random() * 40) + 5
    const winRate = 0.45 + Math.random() * 0.3
    const wins = Math.floor(flips * winRate)
    const avgBet = pick(BET_AMTS)
    const vol = flips * avgBet
    const won = wins * avgBet * 1.9
    const lost = (flips - wins) * avgBet
    return {
      player: w,
      flips,
      won: won * 1e9,
      lost: lost * 1e9,
      volume: vol * 1e9,
      bestStreak: Math.floor(Math.random() * 6) + 1,
      currentStreak: Math.floor(Math.random() * 3),
    }
  })
  // sort by net winnings (biggest win today)
  return entries.sort((a, b) => (b.won - b.lost) - (a.won - a.lost))
}

// initial batch of fake flips
function genInitialFeed(): LiveFlip[] {
  const flips: LiveFlip[] = []
  for (let i = 0; i < 12; i++) {
    const f = genFakeFlip()
    f.ts = Date.now() - (i + 1) * (3000 + Math.random() * 8000)
    flips.push(f)
  }
  return flips
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [feed, setFeed] = useState<LiveFlip[]>(genInitialFeed)
  const [leaders, setLeaders] = useState<LeaderEntry[]>(genFakeLeaders)
  const [connected, setConnected] = useState(true) // fake "connected" for demo
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const leaderRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // inject real flip into feed
  const addRealFlip = useCallback((flip: LiveFlip) => {
    setFeed((prev) => [flip, ...prev].slice(0, 30))
  }, [])

  useEffect(() => {
    // try real WS — if backend is running, use it
    const sock = io(WS_URL, {
      transports: ['websocket', 'polling'],
      timeout: 3000,
      reconnectionAttempts: 2,
    })
    socketRef.current = sock

    sock.on('connect', () => setConnected(true))
    sock.on('disconnect', () => setConnected(false))

    sock.on('recent', (flips: LiveFlip[]) => {
      setFeed((prev) => [...flips, ...prev].slice(0, 30))
    })
    sock.on('flip', (flip: LiveFlip) => {
      setFeed((prev) => [flip, ...prev].slice(0, 30))
    })
    sock.on('leaderboard', (board: LeaderEntry[]) => {
      // merge real leaderboard with fake
      setLeaders((prev) => {
        const merged = [...board, ...prev.filter(p => !board.find(b => b.player === p.player))]
        return merged.sort((a, b) => (b.won - b.lost) - (a.won - a.lost)).slice(0, 10)
      })
    })

    // fake feed — new flip every 3-6 seconds
    const feedTick = () => {
      const fake = genFakeFlip()
      setFeed((prev) => [fake, ...prev].slice(0, 30))
      intervalRef.current = setTimeout(feedTick, 3000 + Math.random() * 3000)
    }
    intervalRef.current = setTimeout(feedTick, 2000 + Math.random() * 3000)

    // refresh leaderboard every 10-18s with small mutations
    const lbTick = () => {
      setLeaders((prev) => {
        const updated = prev.map((e) => {
          if (Math.random() < 0.35) {
            const amt = pick(BET_AMTS) * 1e9
            const won = Math.random() < 0.45
            return {
              ...e,
              flips: e.flips + 1,
              won: won ? e.won + amt * 1.9 : e.won,
              lost: won ? e.lost : e.lost + amt,
              volume: e.volume + amt,
              bestStreak: won && e.currentStreak + 1 > e.bestStreak ? e.currentStreak + 1 : e.bestStreak,
              currentStreak: won ? e.currentStreak + 1 : 0,
            }
          }
          return e
        })
        return updated.sort((a, b) => (b.won - b.lost) - (a.won - a.lost)).slice(0, 10)
      })
      leaderRef.current = setTimeout(lbTick, 10000 + Math.random() * 8000)
    }
    leaderRef.current = setTimeout(lbTick, 8000 + Math.random() * 5000)

    return () => {
      sock.disconnect()
      if (intervalRef.current) clearTimeout(intervalRef.current)
      if (leaderRef.current) clearTimeout(leaderRef.current)
    }
  }, [])

  return { feed, leaders, connected, addRealFlip }
}
