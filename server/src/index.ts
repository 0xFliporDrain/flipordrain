import { Server } from 'socket.io'
import http from 'http'

const srv = http.createServer()
const io = new Server(srv, { cors: { origin: '*' } })

io.on('connection', (ws) => {
  console.log('connected:', ws.id)
  ws.on('disconnect', () => console.log('disconnected:', ws.id))
})

const PORT = process.env.WS_PORT || 3001
srv.listen(PORT, () => console.log(`ws alive on ${PORT}`))
