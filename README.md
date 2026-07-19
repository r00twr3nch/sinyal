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

Bu oyun **canlı Socket.IO sunucusu** ister. GitHub Pages yalnızca statik dosya sunar; oda/oyun mantığı orada çalışmaz.

Önerilen yol: kodu GitHub’a koy, frontend + backend’i **tek Node servisi** olarak [Render](https://render.com) (ücretsiz plan) üzerinde çalıştır.

1. Repo’yu GitHub’a push’la.
2. [Render Dashboard](https://dashboard.render.com) → **New → Blueprint** (veya Web Service) → bu repo’yu seç.
3. `render.yaml` varsa ayarlar otomatik gelir:
   - **Build:** `npm install && npm run build`
   - **Start:** `npm start`
   - **Health:** `/health`
4. Deploy bitince verilen `https://….onrender.com` adresinden oyna.

Üretimde Express hem `dist/` (Vite build) hem Socket.IO’yu aynı origin’den sunar; ekstra `VITE_SERVER_URL` gerekmez.

> Not: Render ücretsiz plan uyku moduna girebilir; ilk açılış 30–60 sn sürebilir.
