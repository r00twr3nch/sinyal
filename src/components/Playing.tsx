import type { ClientState } from '../types/game'

interface PlayingProps {
  state: ClientState
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function Playing({ state }: PlayingProps) {
  const progress = state.roundDuration > 0 ? (state.timeLeft / state.roundDuration) * 100 : 0
  const urgent = state.timeLeft <= 30

  return (
    <div className={`screen playing ${state.isSignaler ? 'signaler' : 'hunter'}`}>
      <header className="top-bar">
        <div>
          <div className="muted">Tur {state.round}</div>
          <div className="code-chip sm">{state.code}</div>
        </div>
        <div className={`timer ${urgent ? 'urgent' : ''}`}>{formatTime(state.timeLeft)}</div>
      </header>

      <div className="timer-bar">
        <div className="timer-fill" style={{ width: `${progress}%` }} />
      </div>

      {state.isSignaler ? (
        <div className="role-card signaler-card">
          <div className="role-label">Sen Sinyalcisin</div>
          <h2>Gizli talimatın</h2>
          <p className="task-text">{state.task?.text}</p>
          <p className="hint">
            Bunu doğal şekilde uygula. Çok belli etme — ama en az 2 kişi fark etsin ki bonus puan
            alasın.
          </p>
        </div>
      ) : (
        <div className="role-card hunter-card">
          <div className="role-label">Gözlemci</div>
          <h2>Sinyalci&apos;yi bul</h2>
          <p className="task-text">Ne yapmaya çalışıyor?</p>
          <p className="hint">
            Normal muhabbet et. Kim garip davranıyor, kim bir şey deniyor? Süre bitince tahmin
            edeceksin.
          </p>
        </div>
      )}

      <section className="card compact">
        <h3>Masada</h3>
        <div className="tags">
          {state.players
            .filter((p) => p.connected)
            .map((p) => (
              <span key={p.id} className="tag">
                {p.name}
              </span>
            ))}
        </div>
      </section>
    </div>
  )
}
