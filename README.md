# TL-Dashboard

[![Version](https://img.shields.io/badge/version-v0.6.0-blue)](https://github.com/techlotse-AI/TL-Dashboard/releases)
[![Build](https://github.com/techlotse-AI/TL-Dashboard/actions/workflows/docker-build-push.yml/badge.svg)](https://github.com/techlotse-AI/TL-Dashboard/actions/workflows/docker-build-push.yml)
[![Docker](https://img.shields.io/badge/DockerHub-techlotse%2Ftl--dashboard-blue?logo=docker)](https://hub.docker.com/r/techlotse/tl-dashboard)

A self-hosted, Docker-based family home dashboard designed for a living-room wall display. Shows live weather, Swiss public transport departures, Google Calendar events, public holidays, an aviation METAR, and a scrolling news ticker — all in one always-on screen.

---

## Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/techlotse-AI/TL-Dashboard.git
cd TL-Dashboard
cp .env.example .env
```

Open `.env` in a text editor and fill in your values (see [Configuration](#configuration) below). At minimum, set your coordinates (`WEATHER_LAT` / `WEATHER_LON`) and your SBB station name (`SBB_STATION_NAME`).

### 2. Start the dashboard

```bash
docker compose up -d
```

Open **http://localhost:18181** in a browser (or point your kiosk browser at it).

```bash
# View logs
docker compose logs -f

# Stop
docker compose down
```

> **Raspberry Pi?** The images are built for both `linux/amd64` and `linux/arm64` — the same command works on Pi 4/5.

---

## Configuration

All configuration lives in your `.env` file. Copy `.env.example` to `.env` and edit as needed.

### Application

| Variable | Default | Description |
|---|---|---|
| `APP_TIMEZONE` | `Europe/Zurich` | IANA timezone for the clock and scheduling |

### Weather

| Variable | Default | Description |
|---|---|---|
| `WEATHER_LAT` | `47.3769` | Latitude of your location |
| `WEATHER_LON` | `8.5417` | Longitude of your location |
| `REFRESH_WEATHER_MINUTES` | `30` | How often to refresh weather data |

Powered by [Open-Meteo](https://open-meteo.com/) — no API key required.

### Swiss Public Transport (SBB)

| Variable | Default | Description |
|---|---|---|
| `SBB_STATION_NAME` | `Zürich HB` | Exact station name (e.g. `Bern`, `Basel SBB`, `Lausanne`) |
| `REFRESH_TRANSPORT_SECONDS` | `60` | How often to refresh the departure board |
| `COMMUTE_ENABLED` | `true` | Show commute route options |
| `COMMUTE_FROM_STATION` | *(empty)* | Commute origin — defaults to `SBB_STATION_NAME` if blank |
| `COMMUTE_TO_STATION` | *(empty)* | Commute destination — leave blank to hide the commute section |
| `COMMUTE_DEPARTURE_TIME` | `07:30` | Morning departure time (`HH:mm`) |
| `COMMUTE_RETURN_TIME` | `17:30` | Evening return time (`HH:mm`) |
| `COMMUTE_WINDOW_MINUTES` | `120` | Minutes after target time before switching to next-day options |
| `COMMUTE_MAX_OPTIONS` | `3` | Number of route options shown per direction |

Powered by [transport.opendata.ch](https://transport.opendata.ch/) — no API key required.

### Google Calendar

| Variable | Default | Description |
|---|---|---|
| `CALENDAR_ICAL_URL` | *(empty)* | iCal URL from Google Calendar settings *(easiest option)* |
| `GOOGLE_CALENDAR_ID` | *(empty)* | Calendar ID for API access *(alternative to iCal)* |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | `/run/secrets/google_sa_key.json` | Container path to service account JSON |
| `CALENDAR_LOOKAHEAD_DAYS` | `14` | How many days ahead to fetch |
| `CALENDAR_DISPLAY_DAYS` | `14` | How many days of events to show in the widget |
| `REFRESH_CALENDAR_MINUTES` | `5` | How often to refresh calendar |

See [Google Calendar Setup](#google-calendar-setup) below.

### Public Holidays

| Variable | Default | Description |
|---|---|---|
| `HOLIDAY_COUNTRY` | `CH` | ISO country code |
| `HOLIDAY_TOWN_1` | `ZH` | Canton code for cantonal holidays (e.g. `ZH`, `BE`, `GE`) |
| `HOLIDAY_TOWN_2` | *(empty)* | Second canton code (optional) |
| `HOLIDAYS_MAX_ITEMS` | `8` | Maximum number of upcoming holidays to display |

Powered by [Nager.Date](https://date.nager.at/) — no API key required.

### RSS News Ticker

| Variable | Default | Description |
|---|---|---|
| `RSS_FEEDS` | BBC World + SRF | Comma-separated list of RSS/Atom feed URLs |
| `REFRESH_RSS_MINUTES` | `10` | How often to refresh feeds |
| `RSS_MAX_ITEMS` | `20` | Maximum headlines per feed |
| `RSS_ITEM_DURATION_SECONDS` | `10` | Seconds each headline is shown in the ticker |

---

## Google Calendar Setup

### Option A — iCal URL (easiest, no API key needed)

1. Open Google Calendar in a browser
2. Click **Settings** (gear icon) → **Settings**
3. In the left sidebar, click your calendar name
4. Scroll down to **Integrate calendar**
5. Copy the **"Secret address in iCal format"** link
6. Paste it into `.env`:

```
CALENDAR_ICAL_URL=https://calendar.google.com/calendar/ical/...
```

### Option B — Service Account (for API access)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Library**
2. Enable the **Google Calendar API**
3. Go to **Credentials → Create Credentials → Service Account**, give it a name and click **Done**
4. Click the new service account → **Keys → Add Key → JSON** → download the file
5. Open Google Calendar → **Settings → [Your Calendar] → Share with specific people**
6. Add the service account email (`name@project.iam.gserviceaccount.com`) with **"See all event details"** permission
7. Copy your **Calendar ID** from Calendar settings → Integrate calendar
8. Place the downloaded JSON key file on your server (e.g. `/home/user/google-sa-key.json`)
9. Uncomment the volume line in `docker-compose.yml`:

```yaml
- /home/user/google-sa-key.json:/run/secrets/google_sa_key.json:ro
```

10. Set in `.env`:

```
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=/run/secrets/google_sa_key.json
```

---

## Kiosk Setup (Raspberry Pi / Linux)

To launch the dashboard automatically in full-screen on startup:

```bash
sudo apt install chromium-browser

mkdir -p ~/.config/autostart
cat > ~/.config/autostart/dashboard.desktop << EOF
[Desktop Entry]
Type=Application
Name=TL-Dashboard
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --app=http://localhost:18181
EOF
```

For a dedicated Pi display, also add to `/etc/xdg/lxsession/LXDE-pi/autostart`:

```
@xset s off
@xset -dpms
@xset s noblank
```

---

## Updating

Pull the latest images and restart:

```bash
docker compose pull
docker compose up -d
```

---

## Troubleshooting

**Calendar shows "unavailable"** — verify your iCal URL or service account key path. Check backend logs: `docker compose logs backend`.

**SBB shows no departures** — ensure `SBB_STATION_NAME` matches exactly how the station appears on the SBB website (e.g. `Zürich HB`, not `Zurich HB`).

**Port 18181 already in use** — change the host port in `docker-compose.yml` from `18181:80` to another port.

---

## Architecture & Development

Technical details, API endpoint reference, project structure, and local development setup are documented in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## License

MIT
