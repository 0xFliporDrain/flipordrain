import { useEffect, useState, useRef } from 'react'
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

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [feed, setFeed] = useState<LiveFlip[]>([])
  const [leaders, setLeaders] = useState<LeaderEntry[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const sock = io(WS_URL, { transports: ['websocket', 'polling'] })
    socketRef.current = sock

    sock.on('connect', () => setConnected(true))
    sock.on('disconnect', () => setConnected(false))

    sock.on('recent', (flips: LiveFlip[]) => setFeed(flips))
    sock.on('flip', (flip: LiveFlip) => {
      setFeed((prev) => [flip, ...prev].slice(0, 50))
    })
    sock.on('leaderboard', (board: LeaderEntry[]) => setLeaders(board))

    return () => {
      sock.disconnect()
    }
  }, [])

  return { feed, leaders, connected }
}
