# Sinyal — Copilot instructions

Real-time multiplayer party game. Turkish UI. One secret **Sinyalci** gets a behavioral task; others guess who and what after timed conversation.

## Stack

- **Client:** Vite + React + TypeScript (`src/`), socket.io-client
- **Server:** Express + Socket.IO (`server/`), tsx
- **Dev:** `npm run dev` runs both (concurrently). Vite `:5173` proxies `/socket.io` → `:3001`
- **Build:** `npm run build` → `tsc -b && vite build`

## Architecture

- In-memory rooms via `RoomManager` in `server/game.ts`
- Phases: `lobby` → `playing` → `voting` → `results`
- Public state: `room:state`; private signaler/task: `player:private` (per socket)
- Signaler identity stays private through playing **and** voting
- Min 3 / max 12 players; default round 210s; tasks in `server/signals.ts`

## Client notes

- Mobile-first dark UI (`src/App.css`)
- Phase router in `src/App.tsx`
- Socket hook: `src/hooks/useSocket.ts` — single socket, merge state via refs
- In DEV, connect with `SERVER_URL = '/'` so the Vite proxy is used (avoids cross-origin WS issues)
- Optional `VITE_SERVER_URL` for phone/LAN direct server access

## Scoring

- Guesser: +2 correct signaler, +1 correct task
- Signaler: +3 if ≥2 found and ratio under 75%; -2 if too obvious; +1 if zero found

## Conventions

- UI copy is Turkish
- Prefer editing game rules in `server/game.ts` and tasks in `server/signals.ts`
- Do not commit secrets; no DB — rooms are process memory only