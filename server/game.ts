import { randomInt } from 'node:crypto'
import { SIGNAL_TASKS, type SignalTask } from './signals.js'

export type GamePhase = 'lobby' | 'playing' | 'voting' | 'results'

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  connected: boolean
  socketId: string
}

export interface Vote {
  signalerId: string
  taskId: string
  customGuess?: string
}

export interface PlayerResult {
  playerId: string
  playerName: string
  guessedSignalerCorrectly: boolean
  guessedTaskCorrectly: boolean
  pointsEarned: number
  vote?: Vote
}

export interface RoundResult {
  signalerId: string
  signalerName: string
  task: SignalTask
  correctSignalerGuesses: number
  signalerBonus: number
  playerResults: PlayerResult[]
}

export interface PublicRoomState {
  code: string
  phase: GamePhase
  players: Omit<Player, 'socketId'>[]
  hostId: string
  round: number
  timeLeft: number
  roundDuration: number
  tasks: SignalTask[]
  lastResult: RoundResult | null
  myVoteSubmitted: boolean
  votesSubmitted: number
}

export interface PrivatePlayerState {
  isSignaler: boolean
  task: SignalTask | null
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const MIN_PLAYERS = 3
const DEFAULT_DURATION = 210 // 3.5 minutes
const POINTS_SIGNALER = 2
const POINTS_TASK = 1
const SIGNALER_BONUS = 3
const SIGNALER_PENALTY_THRESHOLD = 0.75 // if more than 75% guess correctly, no bonus / penalty

function generateCode(length = 5): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)]
  }
  return code
}

function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(arr.length)]
}

export class Room {
  code: string
  hostId: string
  players = new Map<string, Player>()
  phase: GamePhase = 'lobby'
  round = 0
  roundDuration = DEFAULT_DURATION
  timeLeft = 0
  signalerId: string | null = null
  currentTask: SignalTask | null = null
  votes = new Map<string, Vote>()
  lastResult: RoundResult | null = null
  timer: ReturnType<typeof setInterval> | null = null
  recentSignalers: string[] = []
  recentTasks: string[] = []
  onTick: (() => void) | null = null
  onPhaseChange: (() => void) | null = null

  constructor(hostId: string, hostName: string, socketId: string) {
    this.code = generateCode()
    this.hostId = hostId
    this.players.set(hostId, {
      id: hostId,
      name: hostName,
      score: 0,
      isHost: true,
      connected: true,
      socketId,
    })
  }

  static minPlayers = MIN_PLAYERS

  addPlayer(id: string, name: string, socketId: string): { ok: true } | { ok: false; error: string } {
    if (this.phase !== 'lobby') {
      return { ok: false, error: 'Oyun başlamış, odaya girilemez.' }
    }
    const taken = [...this.players.values()].some(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase(),
    )
    if (taken) {
      return { ok: false, error: 'Bu isim zaten kullanılıyor.' }
    }
    if (this.players.size >= 12) {
      return { ok: false, error: 'Oda dolu (maks. 12 kişi).' }
    }
    this.players.set(id, {
      id,
      name: name.trim(),
      score: 0,
      isHost: false,
      connected: true,
      socketId,
    })
    return { ok: true }
  }

  reconnect(playerId: string, socketId: string): boolean {
    const player = this.players.get(playerId)
    if (!player) return false
    player.socketId = socketId
    player.connected = true
    return true
  }

  disconnect(socketId: string): string | null {
    for (const player of this.players.values()) {
      if (player.socketId === socketId) {
        player.connected = false
        return player.id
      }
    }
    return null
  }

  removePlayer(playerId: string): void {
    const player = this.players.get(playerId)
    if (!player) return
    this.players.delete(playerId)
    this.votes.delete(playerId)

    if (player.isHost && this.players.size > 0) {
      const next = [...this.players.values()][0]
      next.isHost = true
      this.hostId = next.id
    }
  }

  setDuration(seconds: number): void {
    if (this.phase !== 'lobby') return
    const clamped = Math.min(300, Math.max(60, seconds))
    this.roundDuration = clamped
  }

  canStart(): { ok: true } | { ok: false; error: string } {
    if (this.phase !== 'lobby' && this.phase !== 'results') {
      return { ok: false, error: 'Oyun zaten devam ediyor.' }
    }
    const connected = [...this.players.values()].filter((p) => p.connected)
    if (connected.length < MIN_PLAYERS) {
      return { ok: false, error: `En az ${MIN_PLAYERS} oyuncu gerekli.` }
    }
    return { ok: true }
  }

  startRound(): { ok: true } | { ok: false; error: string } {
    const check = this.canStart()
    if (!check.ok) return check

    this.clearTimer()
    this.votes.clear()
    this.lastResult = null
    this.round += 1

    const candidates = [...this.players.values()].filter((p) => p.connected)
    const notRecent = candidates.filter((p) => !this.recentSignalers.includes(p.id))
    const pool = notRecent.length > 0 ? notRecent : candidates
    const signaler = pickRandom(pool)
    this.signalerId = signaler.id

    this.recentSignalers.push(signaler.id)
    if (this.recentSignalers.length > Math.max(1, candidates.length - 1)) {
      this.recentSignalers.shift()
    }

    const taskPool = SIGNAL_TASKS.filter((t) => !this.recentTasks.includes(t.id))
    const tasks = taskPool.length > 0 ? taskPool : SIGNAL_TASKS
    this.currentTask = pickRandom(tasks)
    this.recentTasks.push(this.currentTask.id)
    if (this.recentTasks.length > 8) this.recentTasks.shift()

    this.phase = 'playing'
    this.timeLeft = this.roundDuration
    this.startTimer()
    this.onPhaseChange?.()
    return { ok: true }
  }

  private startTimer(): void {
    this.clearTimer()
    this.timer = setInterval(() => {
      this.timeLeft -= 1
      this.onTick?.()
      if (this.timeLeft <= 0) {
        this.clearTimer()
        this.beginVoting()
      }
    }, 1000)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  beginVoting(): void {
    if (this.phase !== 'playing') return
    this.clearTimer()
    this.phase = 'voting'
    this.timeLeft = 0
    this.votes.clear()
    this.onPhaseChange?.()
  }

  submitVote(playerId: string, vote: Vote): { ok: true } | { ok: false; error: string } {
    if (this.phase !== 'voting') {
      return { ok: false, error: 'Şu an oy verilemez.' }
    }
    if (playerId === this.signalerId) {
      return { ok: false, error: 'Sinyalci oy veremez.' }
    }
    if (!this.players.has(playerId)) {
      return { ok: false, error: 'Oyuncu bulunamadı.' }
    }
    if (!vote.signalerId || !vote.taskId) {
      return { ok: false, error: 'Sinyalci ve görev seçmelisin.' }
    }
    this.votes.set(playerId, vote)

    const voters = [...this.players.values()].filter(
      (p) => p.connected && p.id !== this.signalerId,
    )
    if (this.votes.size >= voters.length) {
      this.resolveRound()
    }
    return { ok: true }
  }

  forceResolve(): void {
    if (this.phase === 'voting') {
      this.resolveRound()
    }
  }

  private resolveRound(): void {
    if (!this.signalerId || !this.currentTask) return

    const signaler = this.players.get(this.signalerId)
    if (!signaler) return

    const voters = [...this.players.values()].filter((p) => p.id !== this.signalerId)
    let correctSignalerGuesses = 0

    const playerResults: PlayerResult[] = voters.map((player) => {
      const vote = this.votes.get(player.id)
      const guessedSignalerCorrectly = vote?.signalerId === this.signalerId
      const guessedTaskCorrectly = vote?.taskId === this.currentTask!.id

      if (guessedSignalerCorrectly) correctSignalerGuesses += 1

      let pointsEarned = 0
      if (guessedSignalerCorrectly) pointsEarned += POINTS_SIGNALER
      if (guessedTaskCorrectly) pointsEarned += POINTS_TASK
      player.score += pointsEarned

      return {
        playerId: player.id,
        playerName: player.name,
        guessedSignalerCorrectly,
        guessedTaskCorrectly,
        pointsEarned,
        vote,
      }
    })

    // Signaler scoring: bonus if at least 2 people found them (they succeeded at being noticed subtly)
    // but if TOO obvious (75%+), they lose points instead
    const voterCount = Math.max(1, voters.length)
    const ratio = correctSignalerGuesses / voterCount
    let signalerBonus = 0

    if (correctSignalerGuesses >= 2 && ratio < SIGNALER_PENALTY_THRESHOLD) {
      signalerBonus = SIGNALER_BONUS
    } else if (ratio >= SIGNALER_PENALTY_THRESHOLD && correctSignalerGuesses >= 2) {
      signalerBonus = -2 // too obvious
    } else if (correctSignalerGuesses === 0) {
      signalerBonus = 1 // nobody noticed — subtle but maybe too subtle, small consolation
    }

    signaler.score = Math.max(0, signaler.score + signalerBonus)

    this.lastResult = {
      signalerId: signaler.id,
      signalerName: signaler.name,
      task: this.currentTask,
      correctSignalerGuesses,
      signalerBonus,
      playerResults,
    }

    this.phase = 'results'
    // Keep signalerId/task on lastResult only; clear active round roles
    this.signalerId = null
    this.currentTask = null
    this.votes.clear()
    this.onPhaseChange?.()
  }

  getPublicState(forPlayerId?: string): PublicRoomState {
    return {
      code: this.code,
      phase: this.phase,
      players: [...this.players.values()]
        .map(({ socketId: _, ...p }) => p)
        .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'tr')),
      hostId: this.hostId,
      round: this.round,
      timeLeft: this.timeLeft,
      roundDuration: this.roundDuration,
      tasks: SIGNAL_TASKS,
      lastResult: this.lastResult,
      myVoteSubmitted: forPlayerId ? this.votes.has(forPlayerId) : false,
      votesSubmitted: this.votes.size,
    }
  }

  getPrivateState(playerId: string): PrivatePlayerState {
    // Keep signaler identity during playing + voting so UI can hide the ballot
    const isSignaler =
      (this.phase === 'playing' || this.phase === 'voting') && this.signalerId === playerId
    return {
      isSignaler,
      task: this.phase === 'playing' && isSignaler ? this.currentTask : null,
    }
  }

  destroy(): void {
    this.clearTimer()
  }
}

export class RoomManager {
  rooms = new Map<string, Room>()
  playerRoom = new Map<string, string>() // playerId -> roomCode
  socketPlayer = new Map<string, string>() // socketId -> playerId

  createRoom(playerId: string, name: string, socketId: string): Room {
    let room = new Room(playerId, name, socketId)
    // ensure unique code
    while (this.rooms.has(room.code)) {
      room = new Room(playerId, name, socketId)
    }
    this.rooms.set(room.code, room)
    this.playerRoom.set(playerId, room.code)
    this.socketPlayer.set(socketId, playerId)
    return room
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase())
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const code = this.playerRoom.get(playerId)
    return code ? this.rooms.get(code) : undefined
  }

  getPlayerId(socketId: string): string | undefined {
    return this.socketPlayer.get(socketId)
  }

  joinRoom(
    code: string,
    playerId: string,
    name: string,
    socketId: string,
  ): { ok: true; room: Room } | { ok: false; error: string } {
    const room = this.getRoom(code)
    if (!room) return { ok: false, error: 'Oda bulunamadı.' }
    const result = room.addPlayer(playerId, name, socketId)
    if (!result.ok) return result
    this.playerRoom.set(playerId, room.code)
    this.socketPlayer.set(socketId, playerId)
    return { ok: true, room }
  }

  bindSocket(playerId: string, socketId: string): void {
    this.socketPlayer.set(socketId, playerId)
  }

  leave(socketId: string): { room: Room; playerId: string } | null {
    const playerId = this.socketPlayer.get(socketId)
    if (!playerId) return null
    const room = this.getRoomByPlayer(playerId)
    this.socketPlayer.delete(socketId)
    if (!room) {
      this.playerRoom.delete(playerId)
      return null
    }

    const player = room.players.get(playerId)
    if (player) {
      player.connected = false
    }

    // Remove from lobby immediately; keep during active game for reconnect window
    if (room.phase === 'lobby' || room.phase === 'results') {
      room.removePlayer(playerId)
      this.playerRoom.delete(playerId)
    }

    if (room.players.size === 0) {
      room.destroy()
      this.rooms.delete(room.code)
      return null
    }

    return { room, playerId }
  }

  cleanupEmpty(): void {
    for (const [code, room] of this.rooms) {
      if (room.players.size === 0) {
        room.destroy()
        this.rooms.delete(code)
      }
    }
  }
}
