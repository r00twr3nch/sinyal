import type { ClientState } from '../types/game'

interface ResultsProps {
  state: ClientState
  onNext: () => void
  onLeave: () => void
  error: string | null
  onClearError: () => void
}

export function Results({ state, onNext, onLeave, error, onClearError }: ResultsProps) {
  const result = state.lastResult
  const isHost = state.hostId === state.playerId

  if (!result) {
    return (
      <div className="screen results">
        <div className="card center">
          <p>Sonuçlar yükleniyor…</p>
        </div>
      </div>
    )
  }

  const bonusText =
    result.signalerBonus > 0
      ? `+${result.signalerBonus} bonus`
      : result.signalerBonus < 0
        ? `${result.signalerBonus} (çok belli!)`
        : 'bonus yok'

  return (
    <div className="screen results">
      <header className="top-bar">
        <div>
          <div className="muted">Tur {state.round} sonucu</div>
          <h2>Açılıyor</h2>
        </div>
        <button className="btn ghost sm" type="button" onClick={onLeave}>
          Ayrıl
        </button>
      </header>

      {error && (
        <div className="banner error" onClick={onClearError}>
          {error}
        </div>
      )}

      <section className="card reveal">
        <div className="muted">Sinyalci</div>
        <h2 className="reveal-name">{result.signalerName}</h2>
        <div className="muted">Talimat</div>
        <p className="task-text">{result.task.text}</p>
        <div className="stats-row">
          <div className="stat">
            <strong>{result.correctSignalerGuesses}</strong>
            <span>doğru tahmin</span>
          </div>
          <div className="stat">
            <strong>{bonusText}</strong>
            <span>sinyalci</span>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Bu tur puanları</h3>
        <ul className="player-list">
          <li className="signaler-row">
            <span className="name">{result.signalerName}</span>
            <span className="badge">Sinyalci</span>
            <span className={`score ${result.signalerBonus >= 0 ? 'up' : 'down'}`}>
              {result.signalerBonus >= 0 ? '+' : ''}
              {result.signalerBonus}
            </span>
          </li>
          {result.playerResults.map((pr) => (
            <li key={pr.playerId}>
              <span className="name">{pr.playerName}</span>
              <span className="guess-flags">
                {pr.guessedSignalerCorrectly ? '🎯' : '—'}
                {pr.guessedTaskCorrectly ? '💡' : '—'}
              </span>
              <span className={`score ${pr.pointsEarned > 0 ? 'up' : ''}`}>
                +{pr.pointsEarned}
              </span>
            </li>
          ))}
        </ul>
        <p className="hint tiny">🎯 = sinyalci doğru · 💡 = talimat doğru</p>
      </section>

      <section className="card">
        <h3>Skor tablosu</h3>
        <ol className="scoreboard">
          {state.players.map((p, i) => (
            <li key={p.id}>
              <span className="rank">{i + 1}</span>
              <span className="name">
                {p.name}
                {p.id === state.playerId ? ' (sen)' : ''}
              </span>
              <span className="score">{p.score}</span>
            </li>
          ))}
        </ol>
      </section>

      {isHost ? (
        <button className="btn primary sticky-btn" type="button" onClick={onNext}>
          Sonraki Tur
        </button>
      ) : (
        <div className="banner info">Kurucu sonraki turu başlatacak…</div>
      )}
    </div>
  )
}
