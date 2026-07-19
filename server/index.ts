import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from 'socket.io'
import { randomUUID } from 'node:crypto'
import { RoomManager, type Vote } from './game.js'

const PORT = Number(process.env.PORT) || 3001
// Comma-separated origins, or omit for reflect-any (dev / open party game).
// Example: CLIENT_ORIGIN=https://r00twr3nch.github.io,http://localhost:5173
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : true
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')

const app = express()
app.use(cors({ origin: CLIENT_ORIGIN }))
app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'Signal' })
})

// Production: serve Vite build from the same origin as Socket.IO
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get(/^(?!\/socket\.io\/).*/, (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next()
    })
  })
}

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
})

const manager = new RoomManager()

function broadcastRoom(roomCode: string): void {
  const room = manager.getRoom(roomCode)
  if (!room) return

  for (const player of room.players.values()) {
    if (!player.connected) continue
    io.to(player.socketId).emit('room:state', room.getPublicState(player.id))
    io.to(player.socketId).emit('player:private', room.getPrivateState(player.id))
  }
}

function attachRoomHandlers(roomCode: string): void {
  const room = manager.getRoom(roomCode)
  if (!room) return

  room.onTick = () => {
    // lightweight tick — only timeLeft changes
    for (const player of room.players.values()) {
      if (!player.connected) continue
      io.to(player.socketId).emit('room:state', room.getPublicState(player.id))
    }
  }

  room.onPhaseChange = () => broadcastRoom(room.code)
}

io.on('connection', (socket) => {
  socket.on('room:create', ({ name }, cb) => {
    try {
      const trimmed = (name || '').trim()
      if (trimmed.length < 2 || trimmed.length > 16) {
        cb({ ok: false, error: 'İsim 2-16 karakter olmalı.' })
        return
      }
      const playerId = randomUUID()
      const room = manager.createRoom(playerId, trimmed, socket.id)
      socket.join(room.code)
      attachRoomHandlers(room.code)
      cb({ ok: true, code: room.code, playerId })
      broadcastRoom(room.code)
    } catch {
      cb({ ok: false, error: 'Oda oluşturulamadı.' })
    }
  })

  socket.on('room:join', ({ code, name }, cb) => {
    try {
      const trimmed = (name || '').trim()
      if (trimmed.length < 2 || trimmed.length > 16) {
        cb({ ok: false, error: 'İsim 2-16 karakter olmalı.' })
        return
      }
      const playerId = randomUUID()
      const result = manager.joinRoom(code, playerId, trimmed, socket.id)
      if (!result.ok) {
        cb({ ok: false, error: result.error })
        return
      }
      socket.join(result.room.code)
      attachRoomHandlers(result.room.code)
      cb({ ok: true, playerId })
      broadcastRoom(result.room.code)
    } catch {
      cb({ ok: false, error: 'Odaya girilemedi.' })
    }
  })

  socket.on('room:leave', () => {
    const left = manager.leave(socket.id)
    if (left) broadcastRoom(left.room.code)
  })

  socket.on('game:start', () => {
    const playerId = manager.getPlayerId(socket.id)
    if (!playerId) return
    const room = manager.getRoomByPlayer(playerId)
    if (!room || room.hostId !== playerId) {
      socket.emit('room:error', 'Sadece oda sahibi oyunu başlatabilir.')
      return
    }
    const result = room.startRound()
    if (!result.ok) {
      socket.emit('room:error', result.error)
      return
    }
    broadcastRoom(room.code)
  })

  socket.on('game:next-round', () => {
    const playerId = manager.getPlayerId(socket.id)
    if (!playerId) return
    const room = manager.getRoomByPlayer(playerId)
    if (!room || room.hostId !== playerId) {
      socket.emit('room:error', 'Sadece oda sahibi yeni tur başlatabilir.')
      return
    }
    if (room.phase !== 'results' && room.phase !== 'lobby') {
      socket.emit('room:error', 'Yeni tur için sonuç ekranında olmalısınız.')
      return
    }
    const result = room.startRound()
    if (!result.ok) {
      socket.emit('room:error', result.error)
      return
    }
    broadcastRoom(room.code)
  })

  socket.on('vote:submit', (vote: Vote, cb) => {
    const playerId = manager.getPlayerId(socket.id)
    if (!playerId) {
      cb({ ok: false, error: 'Oturum bulunamadı.' })
      return
    }
    const room = manager.getRoomByPlayer(playerId)
    if (!room) {
      cb({ ok: false, error: 'Oda bulunamadı.' })
      return
    }
    const result = room.submitVote(playerId, vote)
    if (!result.ok) {
      cb({ ok: false, error: result.error })
      return
    }
    cb({ ok: true })
    broadcastRoom(room.code)
  })

  socket.on('settings:duration', (seconds: number) => {
    const playerId = manager.getPlayerId(socket.id)
    if (!playerId) return
    const room = manager.getRoomByPlayer(playerId)
    if (!room || room.hostId !== playerId) return
    room.setDuration(Number(seconds))
    broadcastRoom(room.code)
  })

  socket.on('vote:force', () => {
    const playerId = manager.getPlayerId(socket.id)
    if (!playerId) return
    const room = manager.getRoomByPlayer(playerId)
    if (!room || room.hostId !== playerId) return
    room.forceResolve()
    broadcastRoom(room.code)
  })

  socket.on('disconnect', () => {
    const left = manager.leave(socket.id)
    if (left) broadcastRoom(left.room.code)
  })
})

httpServer.listen(PORT, () => {
  console.log(`Signal server http://localhost:${PORT}`)
})
