import { useState, type FormEvent } from 'react'
import type { ClientState, Vote } from '../types/game'

interface VotingProps {
  state: ClientState
  onSubmit: (vote: Vote) => Promise<unknown>
  error: string | null
  onClearError: () => void
}

export function Voting({ state, onSubmit, error, onClearError }: VotingProps) {
  const [signalerId, setSignalerId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [loading, setLoading] = useState(false)
  const others = state.players.filter((p) => p.id !== state.playerId && p.connected)

  const already = state.myVoteSubmitted
  const isSignaler = state.isSignaler
  const votersTotal = Math.max(0, state.players.filter((p) => p.connected).length - 1)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!signalerId || !taskId) return
    setLoading(true)
    onClearError()
    await onSubmit({ signalerId, taskId })
    setLoading(false)
  }

  if (already || isSignaler) {
    return (
      <div className="screen voting">
        <header className="top-bar">
          <h2>Oylama</h2>
          <div className="muted">
            {state.votesSubmitted}/{votersTotal} oy
          </div>
        </header>
        <div className="card center">
          <div className="logo-mark">⏳</div>
          <h3>{isSignaler ? 'Sinyalci oy vermez' : 'Oyun gönderildi'}</h3>
          <p className="hint">
            {isSignaler
              ? 'Diğerleri seni ve talimatını tahmin ederken bekle…'
              : 'Herkes oy verene kadar bekle…'}
          </p>
          <div className="vote-progress">
            <div
              className="vote-fill"
              style={{ width: `${votersTotal ? (state.votesSubmitted / votersTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="screen voting">
      <header className="top-bar">
        <div>
          <div className="muted">Tur {state.round}</div>
          <h2>Tahmin zamanı</h2>
        </div>
        <div className="muted">
          {state.votesSubmitted}/{votersTotal}
        </div>
      </header>

      {error && (
        <div className="banner error" onClick={onClearError}>
          {error}
        </div>
      )}

      <form className="stack" onSubmit={handleSubmit}>
        <section className="card">
          <h3>Sinyalci kimdi?</h3>
          <div className="choice-grid">
            {others.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`choice ${signalerId === p.id ? 'selected' : ''}`}
                onClick={() => setSignalerId(p.id)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h3>Ne yapıyordu?</h3>
          <div className="choice-list">
            {state.tasks.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`choice left ${taskId === t.id ? 'selected' : ''}`}
                onClick={() => setTaskId(t.id)}
              >
                {t.text}
              </button>
            ))}
          </div>
        </section>

        <button
          className="btn primary sticky-btn"
          type="submit"
          disabled={loading || !signalerId || !taskId}
        >
          {loading ? 'Gönderiliyor…' : 'Tahmini Gönder'}
        </button>
      </form>
    </div>
  )
}
