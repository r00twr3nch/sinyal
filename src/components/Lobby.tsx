import type { ClientState } from '../types/game'

interface LobbyProps {
  state: ClientState
  onStart: () => void
  onLeave: () => void
  onDuration: (seconds: number) => void
  error: string | null
  onClearError: () => void
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s === 0 ? `${m} dk` : `${m}:${String(s).padStart(2, '0')}`
}

export function Lobby({ state, onStart, onLeave, onDuration, error, onClearError }: LobbyProps) {
  const isHost = state.hostId === state.playerId
  const connectedCount = state.players.filter((p) => p.connected).length
  const canStart = connectedCount >= 3

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(state.code)
    } catch {
      // ignore
    }
  }

  return (
    <div className="screen lobby">
      <header className="top-bar">
        <div>
          <div className="muted">Oda kodu</div>
          <button className="code-chip" onClick={copyCode} type="button" title="Kopyala">
            {state.code}
          </button>
        </div>
        <button className="btn ghost sm" onClick={onLeave} type="button">
          Ayrıl
        </button>
      </header>

      {error && (
        <div className="banner error" onClick={onClearError}>
          {error}
        </div>
      )}

      <section className="card">
        <h2>Oyuncular ({connectedCount})</h2>
        <ul className="player-list">
          {state.players.map((p) => (
            <li key={p.id} className={!p.connected ? 'offline' : ''}>
              <span className="dot" />
              <span className="name">
                {p.name}
                {p.id === state.playerId ? ' (sen)' : ''}
              </span>
              {p.isHost && <span className="badge">Kurucu</span>}
              <span className="score">{p.score}p</span>
            </li>
          ))}
        </ul>
        {connectedCount < 3 && (
          <p className="hint">En az 3 oyuncu gerekli. Arkadaşlarına kodu gönder.</p>
        )}
      </section>

      {isHost && (
        <section className="card stack">
          <h3>Tur süresi</h3>
          <div className="duration-row">
            {[120, 180, 210, 240, 300].map((sec) => (
              <button
                key={sec}
                type="button"
                className={`chip ${state.roundDuration === sec ? 'active' : ''}`}
                onClick={() => onDuration(sec)}
              >
                {formatDuration(sec)}
              </button>
            ))}
          </div>
          <button className="btn primary" disabled={!canStart} onClick={onStart} type="button">
            Oyunu Başlat
          </button>
        </section>
      )}

      {!isHost && (
        <div className="banner info">Kurucu oyunu başlatana kadar bekle…</div>
      )}
    </div>
  )
}
