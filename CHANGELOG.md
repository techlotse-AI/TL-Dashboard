# Changelog

All notable changes to TL-Dashboard are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [0.5.0] — 2026-09-12

Audit release: correctness fixes to the METAR widget, a full dependency
refresh onto current majors, and a reproducible, gated build pipeline.

### Fixed
- **METAR — error responses rendered as success.** `useAutoRefresh` called `res.json()` on non-2xx responses and set `status: 'success'` with error-shaped data. The widget then tried to render `data.icao` off `{ error: "..." }` and failed silently. The hook now checks `res.ok` first and throws with the server's error message when there is one.
- **METAR — bad ICAO codes forwarded upstream.** `GET /api/metar` now returns `400` immediately for an empty or non-alphanumeric ICAO instead of passing a malformed request to the AWC API.
- **METAR — missing flight category coloured as VFR.** A null or blank `fltCat` from the AWC API defaulted to `VFR`, showing green for an unknown condition. It now maps to `UNKN`.

### Changed
- **Widget scaling uses `transform: scale()`** instead of the non-standard `zoom` property across all seven widgets, with `transformOrigin` and compensating width calculations.
- **Dependencies refreshed onto current majors** — Express 4 → 5, React 18 → 19, Vite 5 → 8 (Rolldown), Tailwind 3 → 4, TypeScript 5 → 6, date-fns 3 → 4, googleapis 140 → 173, node-ical 0.19 → 0.26, axios 1.7 → 1.20. `npm audit` reports 0 vulnerabilities on both workspaces.
- **Tailwind v4 migration** — `tailwind.config.js` values moved to `@theme {}` in `index.css`; PostCSS now uses `@tailwindcss/postcss`.
- **Docker base image** node:20-alpine → node:22-alpine. Build stages pin `--platform=$BUILDPLATFORM` so multi-arch builds compile natively instead of under QEMU emulation.
- **Repo and image renamed.** The GitHub repo had already moved to `techlotse-AI/TL-Dashboard`; all URLs, badges and clone instructions now point there. The Docker image is renamed `techlotse/tl-dashboard-core` → `techlotse/tl-dashboard` (DockerHub org unchanged). **The new image is not published yet** — `Build & Push` fails at DockerHub login because the org-level secrets stayed under the old `techlotse` org. Do not `docker compose pull` on the production host until that is fixed and one publish succeeds.

### Added
- **Lockfiles committed** (`backend/package-lock.json`, `frontend/package-lock.json`) — the repo previously had none, so every image build resolved caret ranges afresh and no two builds were guaranteed identical. Docker and CI now use `npm ci`.
- **CI quality gate** — a `Type-check & Build` job runs `tsc --noEmit` on both workspaces and builds the frontend; the Docker build and compose validation are gated behind it.
- **Dependabot** (`.github/dependabot.yml`) — weekly npm (backend + frontend), Docker, and GitHub Actions updates, with minor/patch grouped per ecosystem and majors raised separately.

---

## [0.3.3] — 2026-05-22

### Added
- **Commute — "via" label** — single-transfer connections now show the intermediate stop name (e.g. "via Zürich HB") in the connection row so it's clear why a journey takes longer than a direct route would.

### Changed
- **Layout — fluid column gaps** — the transparent space between the three widget columns (and between panels within each column) now scales with the viewport using `clamp()`. On a 1080p screen gaps are ~26px; on 1440p ~34px; on 4K ~60px — the background photo shows through more clearly on large displays. Per-widget zoom scale is unaffected.
- **News ticker bar padding** also scales fluidly (`clamp(6px, 0.8vw, 16px)`) to match the grid.
- **Grid max-width** raised from 1480px → 1800px so the layout fills more of the screen on 1920+ monitors.
- **Commute — smart time selection** — the commute window now distinguishes three states:
  - *Before* the configured time → show connections from that time
  - *Within the window* (past target but within `COMMUTE_WINDOW_MINUTES`) → show connections from **now**, so the next available trains are always visible during the active commute window
  - *After the window* → show tomorrow's connections at the configured time
- **Commute — station pre-resolution** — both commute endpoints (from and to) are now resolved to canonical station IDs via the `/locations` API before querying `/connections`, eliminating ambiguous name-match failures (e.g. "Lupfig" resolving to the wrong stop).
- **Commute — connections limit** raised to `maxOptions + 2` (minimum 5) so minor parse gaps don't shrink the visible list below the configured count.
- **`CommuteLeg`** now carries `departureStation` and `arrivalStation` fields populated from the API's `section.departure.station.name` / `section.arrival.station.name`.

### Fixed
- Return-trip commute showing no results or only distant options during the active evening window — now uses current time as the query anchor when inside the window.

---

## [0.3.2] — 2026-05-22

### Fixed
- **METAR field names** — The AWC METAR JSON API uses different field names than assumed. Updated `metarService.ts` to read the correct fields per the official OpenAPI spec:
  - `r.fltCat` (was `r.flightCategory`) — flight category (VFR / MVFR / IFR / LIFR)
  - `r.wxString` (was `r.wx`) — present weather string (e.g. `-RA`, `TSRA`)
  - `r.clouds` (was `r.skyCondition`) — sky condition layers array
  - `r.obsTime` UNIX integer (was `r.reportTime` ISO string) — observation timestamp, with `reportTime` kept as fallback
- METAR widget now correctly populates all fields instead of showing empty/default values.

---

## [0.3.1] — 2026-05-22

### Fixed
- **METAR 502 errors** — fetch now retries up to 3 times with back-off before falling back to the last known good observation. The widget shows a `STALE` badge instead of an error during transient AWC API outages.

### Changed
- **GitHub Actions — Node.js 24** — updated all action versions ahead of the June 2 2026 forced migration:
  - `docker/setup-qemu-action` v3 → v4
  - `docker/setup-buildx-action` v3 → v4
  - `docker/login-action` v3 → v4
  - `docker/metadata-action` v5 → v6
  - `docker/build-push-action` v5 → v6
  - Added `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true` workflow env variable

---

## [0.3.0] — 2026-05-22

### Added
- **METAR widget** — bottom-right panel showing decoded aviation weather (flight category, wind, visibility, QNH, sky conditions) for any ICAO airport code. No API key required (aviationweather.gov).
- **Settings panel** — slide-in drawer accessible via a gear icon on every widget header. All previously env-var-only settings (weather location, SBB station, commute route, iCal URL, holidays, RSS feeds, METAR ICAO, slideshow interval, etc.) can now be changed at runtime and are persisted to `data/settings.json` on the server.
- **Widget scaling** — every widget has a Scale (%) slider in its settings section. News Ticker defaults to 125% for better living-room legibility.
- **Touch-friendly UI** — minimum 44 px tap targets on all interactive elements, `touch-action: manipulation` on buttons and inputs, active/focus states replacing hover-only interactions, larger input fields.
- **`data/` volume** — persistent settings storage at `/app/data/settings.json`; survives container restarts and updates.

### Changed
- All data services now read key parameters (lat/lon, station name, iCal URL, holiday country/cantons, METAR ICAO) from `getEffectiveConfig()` at fetch time. Changing a setting in the UI takes effect on the next data refresh without a backend restart.
- Cache keys include the effective setting value — switching locations/stations/countries automatically invalidates stale cache entries.

---

## [0.2.0] — 2026-05-21

### Changed
- **Single-container architecture** — backend and frontend now ship as one Docker image (`techlotse/tl-dashboard-core`). nginx is removed; Express serves the React SPA, background images, and API from a single process on port 3001.
- **Root `Dockerfile`** — three-stage multi-arch build (frontend → backend → runtime). Replaces the separate `backend/Dockerfile` + `frontend/Dockerfile` build path for production.
- **`docker-compose.yml`** — simplified to a single `dashboard` service; `docker-compose.hub.yml` deprecated.
- **GitHub Actions CI** — two separate build jobs (backend + frontend) replaced by one job building the root `Dockerfile`.
- **Background image serving** — moved from nginx static files to `express.static` on `/backgrounds/*`, served directly from the mounted volume.
- **SPA fallback** — Express handles the `*` catch-all with long-lived asset caching (`immutable, max-age=1y`) and 1-hour cache for background images.

---

## [0.1.0] — 2026-05-21

### Added
- **`VERSION` file** — single source of version truth at repo root.
- **Four new `.env` settings** wired through the full stack:
  - `BACKGROUND_INTERVAL_SECONDS` (default `15`) — seconds between slideshow photo changes.
  - `RSS_ITEM_DURATION_SECONDS` (default `10`) — seconds each news headline is shown.
  - `HOLIDAYS_MAX_ITEMS` (default `8`) — number of upcoming public holidays displayed.
  - `CALENDAR_DISPLAY_DAYS` (default `14`) — days of calendar events shown in the widget.
- **Deployment README** — rewritten as a deployer-focused guide with version/build badges, full env variable tables, Google Calendar setup instructions, and kiosk (Raspberry Pi) setup.
- **`docs/ARCHITECTURE.md`** — technical reference covering project structure, data sources, API endpoint catalogue, CI/CD setup, and local dev commands.
- **GitHub Actions** — Docker repo configurable via `vars.DOCKER_REPO` org variable; credentials via `ORG_DOCKERHUB_USER` / `ORG_DOCKERHUB_KEY` org secrets.

### Changed
- **SBB departure board** — row spacing halved (`py-2` → `py-1`) for better density at large screen sizes.
- **Panel backgrounds** — reduced to 18% opacity; backdrop blur removed entirely so background photos show through clearly.
- **`docker-compose.yml`** — `env_file` marked `required: false` so CI validate step passes without a `.env` file present.

### Fixed
- **Calendar widget crash** — `new Date(isoString + 'T00:00:00')` produced an invalid date for all-day events where the backend already sends full ISO strings. Fixed with a `safeParse()` helper that strips the time portion before parsing.
- **Background images 403** — nginx `alias` directive outside the html root returned 403. Fixed by mounting `./backgrounds` directly under nginx's html root.
- **nginx regex intercept** — `location ~* \.(jpg|…)` was intercepting `/api/backgrounds/photo.jpg` before the API location block. Fixed with a `^~` prefix modifier on the `/api/` location.
- **TypeScript build failure** — `React.ElementType` used without importing React in `WeatherIcon.tsx` under strict mode. Fixed by using `LucideIcon` from `lucide-react`.

---

## [0.0.1] — 2026-05-19

### Added
- Initial release.
- Live weather widget (Open-Meteo — current conditions, hourly today, 3-day forecast).
- Swiss public transport departure board with optional commute route (transport.opendata.ch).
- Google Calendar widget (iCal URL or service account API).
- Swiss public holidays widget (Nager.Date, national + cantonal).
- Live 24-hour clock.
- Background photo slideshow from a local folder.
- Scrolling RSS news ticker.
- Two-container Docker setup (Node.js backend + nginx frontend).
- Multi-arch Docker images (`linux/amd64`, `linux/arm64`) via GitHub Actions.
- Full `.env` configuration with `.env.example` template.

[0.5.0]: https://github.com/techlotse-AI/TL-Dashboard/releases/tag/v0.5.0
[0.3.3]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/techlotse-AI/TL-Dashboard/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/techlotse-AI/TL-Dashboard/releases/tag/v0.0.1
