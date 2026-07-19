# Sinyal

Gerçek zamanlı parti oyunu. Oyuncular kendi telefonlarından bağlanır; her turda biri gizli **Sinyalci** olur ve talimatını davranışlarıyla uygular. Diğerleri kim olduğunu ve ne yaptığını tahmin eder.

## Gereksinimler

- Node.js 20+
- Aynı Wi‑Fi ağı (telefonlardan oynamak için)

## Kurulum

```bash
npm install
```

## Geliştirme

```bash
npm run dev
```

- Web: http://localhost:5173
- API / Socket: http://localhost:3001
- Sağlık: http://localhost:3001/health

VS Code’da **Terminal → Run Task → dev** ile de başlatılabilir (`.vscode/tasks.json`).

Geliştirmede istemci Socket.IO’yu aynı origin üzerinden kullanır; Vite `/socket.io` isteklerini `3001` portuna proxy’ler.

### Telefondan / LAN

1. Bilgisayar ve telefon aynı Wi‑Fi’de olsun.
2. Bilgisayarın yerel IP’sini öğrenin (ör. `192.168.1.20`).
3. Telefonda `http://192.168.1.20:5173` açın.

Proxy yalnızca Vite üzerinden çalışır. İstemcinin sunucuya doğrudan bağlanması gerekirse proje kökünde `.env`:

```
VITE_SERVER_URL=http://192.168.1.20:3001
```

Sonra `npm run dev` yeniden başlatın.

## Nasıl oynanır?

1. Biri **Oda Kur** der, kodu paylaşır.
2. Diğerleri **Koda Katıl** ile girer (en az 3 kişi).
3. Kurucu tur süresini seçip oyunu başlatır.
4. Rastgele 1 kişi Sinyalci olur; sadece onun ekranında gizli talimat görünür.
5. Süre bitince herkes sinyalciyi ve talimatı tahmin eder.
6. Sonuçlar açılır, puanlar dağıtılır, sonraki tur başlar.

## Puanlama

| Durum | Puan |
|--------|------|
| Sinyalciyi doğru bilmek | +2 |
| Talimatı doğru bilmek | +1 |
| Sinyalci: en az 2 kişi buldu ve çok belli değil | +3 |
| Sinyalci: neredeyse herkes buldu (çok belli) | -2 |
| Sinyalci: kimse bulamadı | +1 |

## Komutlar

| Komut | Açıklama |
|--------|----------|
| `npm run dev` | Sunucu + istemci birlikte |
| `npm run dev:client` | Sadece Vite |
| `npm run dev:server` | Sadece Socket sunucusu |
| `npm run build` | Üretim derlemesi |
| `npm start` | Sunucuyu başlat |

## Yapı

- `src/` — React (mobil öncelikli UI)
- `server/` — Express + Socket.IO oda/oyun mantığı
- `server/signals.ts` — gizli talimat havuzu

## Yayınlama (deploy)

Socket.IO sunucusu **sürekli çalışan Node process** ister. Vercel/GitHub Pages yalnız UI içindir.

### A) Hepsi bir arada (en basit)

Frontend + backend tek Node servisi — [Render](https://render.com) ücretsiz plan:

1. [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** → bu repo
2. `render.yaml` ayarları:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Health:** `/health`
3. `https://….onrender.com` adresinden oyna

> Ücretsiz planda uyku olabilir; ilk açılış 30–60 sn sürebilir.

### B) Vercel (UI) + Render (oyun sunucusu) — önerilen hibrit

Herkes tek Vercel linkinden girer; kimse sunucu URL’si yapıştırmaz.

```text
https://sinyal.vercel.app  →  UI (Vercel)
            │  VITE_SERVER_URL
            ▼
https://sinyal-xxxx.onrender.com  →  Socket.IO (Render)
```

#### 1) Render backend

1. [Render](https://dashboard.render.com) → **New → Web Service** → `r00twr3nch/sinyal`
2. Build: `npm install && npm run build` · Start: `npm start` · Free
3. Env:
   - `NODE_ENV` = `production`
   - `CLIENT_ORIGIN` = şimdilik  
     `http://localhost:5173,https://r00twr3nch.github.io,https://yunusemredurak.com.tr`  
     (Vercel URL’si çıkınca ekleyeceksin)
4. Deploy → URL’yi kopyala, örn. `https://sinyal-xxxx.onrender.com`
5. Kontrol: `…/health` → `{"ok":true,"name":"Signal"}`

#### 2) Vercel frontend

1. [vercel.com/new](https://vercel.com/new) → GitHub `r00twr3nch/sinyal` import
2. Framework: **Vite** (otomatik / `vercel.json`)
3. **Environment Variables** (Production):
   - `VITE_SERVER_URL` = `https://sinyal-xxxx.onrender.com`  ← Render URL
4. Deploy → `https://….vercel.app` adresini kopyala

#### 3) CORS’u Vercel’e aç

Render → service → **Environment** → `CLIENT_ORIGIN` içine Vercel origin’ini ekle:

```text
https://YOUR-APP.vercel.app,https://r00twr3nch.github.io,https://yunusemredurak.com.tr,http://localhost:5173
```

Save → Render servisi restart.

Bundan sonra herkes yalnızca Vercel linkini açar; bağlantı otomatik.

### C) GitHub Pages + Render

Pages yalnız UI. Aynı model: Render backend + (opsiyonel) Actions secret `VITE_SERVER_URL`.

1. Backend’i (B/1) gibi deploy et
2. Repo → **Settings → Secrets → Actions** → `VITE_SERVER_URL`
3. **Deploy GitHub Pages** workflow / `main` push
4. Site: `https://r00twr3nch.github.io/sinyal/`  
   Secret yoksa ana ekranda **Sunucu ayarı** (yalnız o tarayıcı)

Geliştirmede Vite proxy kullanılır; monolit Render deploy’da Express `dist/` + Socket.IO’yu aynı origin’den sunar.
