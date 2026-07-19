export type GamePhase = 'lobby' | 'playing' | 'voting' | 'results'

export interface Player {
  id: string
  name: string
  score: number
  isHost: boolean
  connected: boolean
}

export interface SignalTask {
  id: string
  text: string
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
  players: Player[]
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

export interface ClientState extends PublicRoomState {
  playerId: string
  playerName: string
  isSignaler: boolean
  task: SignalTask | null
}

export type ServerToClientEvents = {
  'room:state': (state: PublicRoomState) => void
  'player:private': (state: PrivatePlayerState) => void
  'room:error': (message: string) => void
  'room:kicked': (message: string) => void
}

export type ClientToServerEvents = {
  'room:create': (payload: { name: string }, cb: (res: { ok: boolean; code?: string; playerId?: string; error?: string }) => void) => void
  'room:join': (payload: { code: string; name: string }, cb: (res: { ok: boolean; playerId?: string; error?: string }) => void) => void
  'room:leave': () => void
  'game:start': () => void
  'game:next-round': () => void
  'vote:submit': (vote: Vote, cb: (res: { ok: boolean; error?: string }) => void) => void
  'settings:duration': (seconds: number) => void
}
