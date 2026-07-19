import { useState, type FormEvent } from 'react'

interface HomeProps {
  connected: boolean
  error: string | null
  serverUrl: string
  onServerUrlChange: (url: string) => void
  onCreate: (name: string) => Promise<unknown>
  onJoin: (code: string, name: string) => Promise<unknown>
  onClearError: () => void
}

export function Home({
  connected,
  error,
  serverUrl,
  onServerUrlChange,
  onCreate,
  onJoin,
  onClearError,
}: HomeProps) {
  const [mode, setMode] = useState<'menu' | 'create' | 'join' | 'server'>('menu')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [serverDraft, setServerDraft] = useState(serverUrl === '/' ? '' : serverUrl)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onCreate(name)
    setLoading(false)
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    await onJoin(code, name)
    setLoading(false)
  }

  function handleServerSave(e: FormEvent) {
    e.preventDefault()
    onServerUrlChange(serverDraft.trim() || '/')
    setMode('menu')
  }

  const needsRemoteServer = import.meta.env.PROD && (serverUrl === '/' || !connected)

  return (
    <div className="screen home">
      <div className="hero">
        <div className="logo-mark">📡</div>
        <h1>Sinyal</h1>
        <p className="tagline">
          Gizli talimatı davranışlarınla ver.
          <br />
          Diğerleri seni yakalasın.
        </p>
      </div>

      {!connected && (
        <div className="banner warn">
          {needsRemoteServer
            ? 'Oyun sunucusuna bağlanılamadı. Aşağıdan sunucu adresini ayarla.'
            : 'Sunucuya bağlanılıyor…'}
        </div>
      )}
      {error && (
        <div className="banner error" onClick={onClearError} role="alert">
          {error}
        </div>
      )}

      {mode === 'menu' && (
        <div className="stack">
          <button className="btn primary" disabled={!connected} onClick={() => setMode('create')}>
            Oda Kur
          </button>
          <button className="btn secondary" disabled={!connected} onClick={() => setMode('join')}>
            Koda Katıl
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setServerDraft(serverUrl === '/' ? '' : serverUrl)
              setMode('server')
            }}
          >
            Sunucu ayarı
          </button>
          {serverUrl !== '/' && (
            <p className="muted tiny">
              Sunucu: {serverUrl}
              {connected ? ' · bağlı' : ' · kopuk'}
            </p>
          )}
          <div className="how-to">
            <h3>Nasıl oynanır?</h3>
            <ol>
              <li>Oda kur veya kodla gir (min. 3 kişi)</li>
              <li>Her turda 1 kişi gizli Sinyalci olur</li>
              <li>Sinyalci talimatını doğal uygular</li>
              <li>Süre bitince herkes tahmin eder</li>
              <li>Doğru bilenler ve ustaca sinyal veren puan alır</li>
            </ol>
          </div>
        </div>
      )}

      {mode === 'server' && (
        <form className="stack card" onSubmit={handleServerSave}>
          <h2>Oyun sunucusu</h2>
          <p className="muted tiny">
            GitHub Pages sadece arayüzü barındırır. Oda/oyun için Render (veya benzeri) üzerindeki
            sunucu adresini gir.
          </p>
          <label>
            Sunucu URL
            <input
              autoFocus
              type="url"
              placeholder="https://sinyal-xxxx.onrender.com"
              value={serverDraft}
              onChange={(e) => setServerDraft(e.target.value)}
            />
          </label>
          <button className="btn primary" type="submit">
            Kaydet ve bağlan
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => {
              setServerDraft('')
              onServerUrlChange('/')
              setMode('menu')
            }}
          >
            Varsayılan (aynı origin)
          </button>
          <button className="btn ghost" type="button" onClick={() => setMode('menu')}>
            Geri
          </button>
        </form>
      )}

      {mode === 'create' && (
        <form className="stack card" onSubmit={handleCreate}>
          <h2>Oda Kur</h2>
          <label>
            İsmin
            <input
              autoFocus
              maxLength={16}
              placeholder="Örn. Ayşe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading || !connected}>
            {loading ? 'Kuruluyor…' : 'Odayı Oluştur'}
          </button>
          <button className="btn ghost" type="button" onClick={() => setMode('menu')}>
            Geri
          </button>
        </form>
      )}

      {mode === 'join' && (
        <form className="stack card" onSubmit={handleJoin}>
          <h2>Odaya Katıl</h2>
          <label>
            İsmin
            <input
              autoFocus
              maxLength={16}
              placeholder="Örn. Mehmet"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label>
            Oda Kodu
            <input
              className="code-input"
              maxLength={6}
              placeholder="ABC12"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              minLength={4}
              autoCapitalize="characters"
            />
          </label>
          <button className="btn primary" type="submit" disabled={loading || !connected}>
            {loading ? 'Giriliyor…' : 'Katıl'}
          </button>
          <button className="btn ghost" type="button" onClick={() => setMode('menu')}>
            Geri
          </button>
        </form>
      )}
    </div>
  )
}
