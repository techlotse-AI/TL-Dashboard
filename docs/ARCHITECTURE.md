# TL-Dashboard — Architecture & Development

## Overview

TL-Dashboard runs as a **single Docker container**. The Node.js/Express backend serves everything: API routes, background images, and the compiled React SPA.

```
Browser
  │
  └─► Express :3001
        ├─ /api/*          → API handlers (weather, transport, calendar…)
        ├─ /backgrounds/*  → static files (volume-mounted photos)
        └─ /*              → React SPA (built assets + index.html fallback)
```

The Docker image is built in three stages:

1. **frontend-build** — `node:22-alpine`, runs `vite build`, produces `dist/`
2. **backend-build** — `node:22-alpine`, runs `tsc`, produces `dist/`
3. **runtime** — `node:22-alpine`, copies backend `dist/` → `/app/dist`, frontend `dist/` → `/app/public`, production `node_modules` only

---

## Project Structure

```
TL-Dashboard-Core/
├── .github/
│   └── workflows/
│       └── docker-build-push.yml   Multi-arch CI build → DockerHub (single image)
├── Dockerfile                      Multi-stage root Dockerfile (frontend + backend → one image)
├── backend/
│   ├── src/
│   │   ├── config.ts               Central env-var config with typed defaults
│   │   ├── logger.ts               Winston logger
│   │   ├── index.ts                Express app entry point
│   │   ├── routes/                 One file per API endpoint
│   │   │   ├── weather.ts
│   │   │   ├── transport.ts
│   │   │   ├── calendar.ts
│   │   │   ├── holidays.ts
│   │   │   ├── rss.ts
│   │   │   ├── backgrounds.ts
│   │   │   ├── config.ts
│   │   │   └── health.ts
│   │   └── services/               Data fetching + in-memory caching
│   │       ├── weatherService.ts
│   │       ├── transportService.ts
│   │       ├── calendarService.ts
│   │       ├── holidayService.ts
│   │       ├── rssService.ts
│   │       └── backgroundService.ts
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                 Root layout and data orchestration
│   │   ├── main.tsx                Entry point with ErrorBoundary
│   │   ├── index.css               Tailwind + panel utility classes
│   │   ├── components/
│   │   │   ├── Clock.tsx
│   │   │   ├── Weather.tsx
│   │   │   ├── WeatherIcon.tsx
│   │   │   ├── Transport.tsx
│   │   │   ├── CalendarWidget.tsx
│   │   │   ├── Holidays.tsx
│   │   │   ├── NewsTicker.tsx
│   │   │   ├── Background.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   └── useAutoRefresh.ts   Polling hook with exponential backoff
│   │   └── types/
│   │       └── index.ts            Shared TypeScript interfaces
│   ├── nginx.conf                  Production nginx config
│   ├── Dockerfile
│   └── package.json
├── backgrounds/                    Drop photos here (.jpg/.jpeg/.png/.webp)
├── docs/
│   └── ARCHITECTURE.md            This file
├── docker-compose.yml              Deploy from DockerHub (production)
├── .env.example                    Config template
└── VERSION                         Current version string
```

---

## Backend

### Config (`src/config.ts`)

All environment variables are parsed here with typed defaults. No other file reads `process.env` directly. The `/api/config` endpoint exposes a non-sensitive subset to the frontend.

### Caching

Each service module maintains a simple in-memory cache with a TTL. On cache miss the external API is called; on hit the cached value is returned immediately. This ensures the dashboard responds instantly even when upstream APIs are slow.

### Data sources

| Widget | API | Rate |
|---|---|---|
| Weather | [Open-Meteo](https://open-meteo.com/) | Configurable; default 30 min |
| Transport | [transport.opendata.ch](https://transport.opendata.ch/) | Configurable; default 60 s |
| Calendar | Google Calendar API or iCal | Configurable; default 5 min |
| Holidays | [Nager.Date](https://date.nager.at/) | Once per hour |
| RSS | Any RSS/Atom feed | Configurable; default 10 min |
| Backgrounds | Local filesystem | Every 5 min (file list refresh) |

---

## Frontend

Built with React 18 + Vite + TypeScript + Tailwind CSS. All layout is in `App.tsx` using a CSS Grid:

```
┌──────────────┬──────────────────────────┬──────────────┐
│   Weather    │        SBB Board         │   Clock      │
│              │  departures + commute    │              │
│   Calendar   │                          │   Holidays   │
└──────────────┴──────────────────────────┴──────────────┘
└─────────────────────── RSS Ticker ───────────────────────┘
```

### `useAutoRefresh` hook

Fetches a URL on mount and then polls at the specified interval. Returns a typed `FetchState<T>` union (`idle | loading | success | error`). All widgets gracefully degrade to an error state when their data source is unavailable.

### Background images

Images are served as plain static files by nginx (`/backgrounds/` under nginx's html root). The `Background` component uses CSS `background-image` on a `<div>` — 404s are silently ignored and don't break the component. Transitions are a simple opacity fade.

---

## API Reference

All endpoints are served under `/api/`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check — returns `{ status: "ok" }` |
| `GET` | `/api/config` | Non-sensitive runtime config for the frontend |
| `GET` | `/api/weather` | Current conditions, hourly today, 3-day forecast |
| `GET` | `/api/transport` | SBB departure board + commute options |
| `GET` | `/api/calendar` | Upcoming Google Calendar events |
| `GET` | `/api/holidays` | Upcoming Swiss public holidays |
| `GET` | `/api/rss` | Latest RSS/Atom headlines |
| `GET` | `/api/backgrounds` | JSON list of background image paths |

---

## CI / CD

The workflow at `.github/workflows/docker-build-push.yml` runs on every push to `main` and on `v*.*.*` tags.

It builds multi-arch images (`linux/amd64` + `linux/arm64`) and pushes to DockerHub.

**Required GitHub organisation variables:**
- `DOCKER_REPO` — DockerHub image base name (e.g. `techlotse/tl-dashboard`)

**Required GitHub organisation secrets:**
- `DOCKERHUB_USERNAME` — DockerHub username
- `DOCKERHUB_TOKEN` — DockerHub access token (create at hub.docker.com/settings/security)

**Tag and release:**

```bash
git tag v0.1.0 && git push origin v0.1.0
```

---

## Local Development

### Backend

```bash
cd backend
npm install
cp ../.env.example ../.env   # edit as needed
npm run dev
# API available at http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# Opens http://localhost:5173
# Vite proxies /api/* to http://localhost:3001
```

### Type-check + build

```bash
cd frontend && npx tsc --noEmit   # type-check only
cd frontend && npm run build       # full production build
```

---

## Canton Codes (Switzerland)

`AG` Aargau · `AI` Appenzell Innerrhoden · `AR` Appenzell Ausserrhoden · `BE` Bern · `BL` Basel-Landschaft · `BS` Basel-Stadt · `FR` Fribourg · `GE` Geneva · `GL` Glarus · `GR` Graubünden · `JU` Jura · `LU` Lucerne · `NE` Neuchâtel · `NW` Nidwalden · `OW` Obwalden · `SG` St. Gallen · `SH` Schaffhausen · `SO` Solothurn · `SZ` Schwyz · `TG` Thurgau · `TI` Ticino · `UR` Uri · `VD` Vaud · `VS` Valais · `ZG` Zug · `ZH` Zurich
