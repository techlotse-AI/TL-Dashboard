# TL-Dashboard — Architecture & Development

## Overview

TL-Dashboard runs as a **single Docker container**. The Node.js/Express backend serves everything: API routes and the compiled React SPA.

```
Browser
  │
  └─► Express :3001
        ├─ /api/*          → API handlers (weather, transport, calendar…)
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
│   │   │   ├── config.ts
│   │   │   └── health.ts
│   │   └── services/               Data fetching + in-memory caching
│   │       ├── weatherService.ts
│   │       ├── transportService.ts
│   │       ├── calendarService.ts
│   │       ├── holidayService.ts
│   │       ├── rssService.ts
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
│   │   │   └── ErrorBoundary.tsx
│   │   ├── hooks/
│   │   │   └── useAutoRefresh.ts   Polling hook with exponential backoff
│   │   └── types/
│   │       └── index.ts            Shared TypeScript interfaces
│   └── package.json
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

---

## Frontend

Built with React 19 + Vite 8 + TypeScript + Tailwind CSS 4. Layout is a CSS Grid with named areas (`.dash-grid` in `index.css`), placed from `App.tsx`. The grid is **orientation-aware**. The primary target is the 1920×1080 landscape wall display; a portrait arrangement is kept for rotated screens:

```
Landscape (1920×1080) — primary          Portrait (1080×1920)
┌──────────────────────┬──────────┐      ┌──────────┬──────────┐
│  Weather             │  Clock   │      │  Clock   │  METAR   │
│  now · today · 3 days│          │      ├──────────┴──────────┤
├───────────┬──────────┼──────────┤      │  Weather            │
│  Calendar │  SBB     │ Holidays │      ├──────────┬──────────┤
│           │          ├──────────┤      │ Calendar │  SBB     │
│           │          │  METAR   │      │          ├──────────┤
└───────────┴──────────┴──────────┘      │          │ Holidays │
└────────── RSS Ticker ───────────┘      └──────────┴──────────┘
```

Landscape columns are weighted 1.2 : 1 : 0.75 (Calendar : SBB : right column) across the full width (capped at 1800px).

Per-widget scale (Settings → Scale) is applied with CSS `zoom`, so enlarged content grows *inside* its grid cell rather than overflowing it. The Weather and METAR panels use container queries (`@container`) to switch between a wide row layout and a stacked one depending on the cell they land in.

### `useAutoRefresh` hook

Fetches a URL on mount and then polls at the specified interval. Returns a typed `FetchState<T>` union (`idle | loading | success | error`). All widgets gracefully degrade to an error state when their data source is unavailable.

## API Reference

All endpoints are served under `/api/`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Liveness check — returns `{ status: "ok" }` |
| `GET` | `/api/config` | Non-sensitive runtime config for the frontend |
| `GET` | `/api/weather` | Current conditions, hourly for today + tomorrow, today's hi/lo + sun times, 3-day forecast |
| `GET` | `/api/transport` | SBB departure board + commute options |
| `GET` | `/api/calendar` | Upcoming Google Calendar events |
| `GET` | `/api/holidays` | Upcoming Swiss public holidays |
| `GET` | `/api/rss` | Latest RSS/Atom headlines |

---

## CI / CD

The workflow at `.github/workflows/docker-build-push.yml` runs on every push to `main` and on `v*.*.*` tags.

It builds multi-arch images (`linux/amd64` + `linux/arm64`) and pushes to DockerHub.

The image name `techlotse/tl-dashboard` is fixed in the workflow (no `DOCKER_REPO` variable — a stale one once redirected releases to the old name).

**Required GitHub organisation secrets:**
- `DOCKERHUB_USER` — DockerHub username
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
