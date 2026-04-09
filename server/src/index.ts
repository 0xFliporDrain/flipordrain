import { Server } from 'socket.io'
import http from 'http'
import { startListener } from './listener'
import { updateBoard, getTop, getPlayer } from './leaderboard'
import { FlipEvent } from './types'

const srv = http.createServer()
const io = new Server(srv, { cors: { origin: '*' } })

// recent flips for new connections
const recentFlips: FlipEvent[] = []
const MAX_RECENT = 50

function handleFlip(evt: FlipEvent) {
  recentFlips.unshift(evt)
  if (recentFlips.length > MAX_RECENT) recentFlips.pop()
  updateBoard(evt)
  io.emit('flip', evt)
}

io.on('connection', (ws) => {
  console.log('connected:', ws.id)

  // send recent flips + leaderboard on connect
  ws.emit('recent', recentFlips)
  ws.emit('leaderboard', getTop())

  ws.on('getLeaderboard', () => ws.emit('leaderboard', getTop()))
  ws.on('getPlayer', (addr: string) => ws.emit('player', getPlayer(addr)))
  ws.on('disconnect', () => console.log('disconnected:', ws.id))
})

// start helius log listener
const rpcUrl = process.env.HELIUS_WS_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com'
startListener(rpcUrl, handleFlip)

const PORT = process.env.WS_PORT || 3001
srv.listen(PORT, () => console.log(`ws alive on ${PORT}`))
