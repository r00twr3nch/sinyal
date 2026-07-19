import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
  ClientToServerEvents,
  ClientState,
  PrivatePlayerState,
  PublicRoomState,
  ServerToClientEvents,
  Vote,
} from '../types/game'

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Same-origin by default (Vite proxy in dev, Express static+Socket in prod).
// Override with VITE_SERVER_URL only when client and server are on different hosts.
const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/'

export function useSocket() {
  const socketRef = useRef<AppSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [state, setState] = useState<ClientState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playerId, setPlayerId] = useState<string | null>(null)

  const playerIdRef = useRef<string | null>(null)
  const playerNameRef = useRef('')
  const publicRef = useRef<PublicRoomState | null>(null)
  const privateRef = useRef<PrivatePlayerState>({ isSignaler: false, task: null })

  const mergeState = useCallback(() => {
    if (!publicRef.current || !playerIdRef.current) return
    setState({
      ...publicRef.current,
      playerId: playerIdRef.current,
      playerName: playerNameRef.current,
      isSignaler: privateRef.current.isSignaler,
      task: privateRef.current.task,
    })
  }, [])

  useEffect(() => {
    const socket: AppSocket = io(SERVER_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('room:state', (roomState) => {
      publicRef.current = roomState
      mergeState()
    })

    socket.on('player:private', (priv) => {
      privateRef.current = priv
      mergeState()
    })

    socket.on('room:error', (message) => setError(message))
    socket.on('room:kicked', (message) => {
      setError(message)
      setState(null)
      setPlayerId(null)
      playerIdRef.current = null
      publicRef.current = null
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [mergeState])

  const api = useMemo(
    () => ({
      createRoom(name: string): Promise<{ ok: boolean; error?: string }> {
        return new Promise((resolve) => {
          setError(null)
          socketRef.current?.emit('room:create', { name }, (res) => {
            if (res.ok && res.playerId && res.code) {
              playerIdRef.current = res.playerId
              playerNameRef.current = name.trim()
              setPlayerId(res.playerId)
              mergeState()
              resolve({ ok: true })
            } else {
              setError(res.error || 'Oda oluşturulamadı')
              resolve({ ok: false, error: res.error })
            }
          })
        })
      },

      joinRoom(code: string, name: string): Promise<{ ok: boolean; error?: string }> {
        return new Promise((resolve) => {
          setError(null)
          socketRef.current?.emit(
            'room:join',
            { code: code.trim().toUpperCase(), name },
            (res) => {
              if (res.ok && res.playerId) {
                playerIdRef.current = res.playerId
                playerNameRef.current = name.trim()
                setPlayerId(res.playerId)
                mergeState()
                resolve({ ok: true })
              } else {
                setError(res.error || 'Odaya girilemedi')
                resolve({ ok: false, error: res.error })
              }
            },
          )
        })
      },

      leaveRoom() {
        socketRef.current?.emit('room:leave')
        setState(null)
        setPlayerId(null)
        playerIdRef.current = null
        playerNameRef.current = ''
        publicRef.current = null
        privateRef.current = { isSignaler: false, task: null }
      },

      startGame() {
        setError(null)
        socketRef.current?.emit('game:start')
      },

      nextRound() {
        setError(null)
        socketRef.current?.emit('game:next-round')
      },

      submitVote(vote: Vote): Promise<{ ok: boolean; error?: string }> {
        return new Promise((resolve) => {
          socketRef.current?.emit('vote:submit', vote, (res) => {
            if (!res.ok) setError(res.error || 'Oy gönderilemedi')
            resolve(res)
          })
        })
      },

      setDuration(seconds: number) {
        socketRef.current?.emit('settings:duration', seconds)
      },

      clearError() {
        setError(null)
      },
    }),
    [mergeState],
  )

  return { connected, state, error, api, playerId }
}
