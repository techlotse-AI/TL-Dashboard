/**
 * Central configuration — all values sourced from environment variables.
 * See .env.example in the project root for documentation.
 */
import dotenv from 'dotenv';
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function optionalNumber(key: string, fallback: number): number {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function optionalBoolean(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(val.toLowerCase());
}

export const config = {
  // ── Server ────────────────────────────────────────────────────────────────
  port: optionalNumber('PORT', 3001),
  nodeEnv: optional('NODE_ENV', 'production'),

  // ── Timezone ──────────────────────────────────────────────────────────────
  timezone: optional('APP_TIMEZONE', 'Europe/Zurich'),

  // ── Weather (Open-Meteo — no API key required) ────────────────────────────
  weather: {
    lat: optional('WEATHER_LAT', '47.3769'),   // Default: Zurich
    lon: optional('WEATHER_LON', '8.5417'),
    // WEATHER_PROVIDER is reserved for future alternative providers
    provider: optional('WEATHER_PROVIDER', 'open-meteo'),
    refreshMinutes: optionalNumber('REFRESH_WEATHER_MINUTES', 30),
  },

  // ── SBB / Swiss Public Transport (transport.opendata.ch) ─────────────────
  transport: {
    stationName: optional('SBB_STATION_NAME', 'Zürich HB'),
    refreshSeconds: optionalNumber('REFRESH_TRANSPORT_SECONDS', 60),
  },

  // ── Optional commute route shown inside the transport widget ─────────────
  // COMMUTE_FROM_STATION defaults to SBB_STATION_NAME when left blank.
  commute: {
    enabled: optionalBoolean('COMMUTE_ENABLED', true),
    fromStation: optional('COMMUTE_FROM_STATION', ''),
    toStation: optional('COMMUTE_TO_STATION', ''),
    departureTime: optional('COMMUTE_DEPARTURE_TIME', '07:30'),
    returnTime: optional('COMMUTE_RETURN_TIME', '17:30'),
    windowMinutes: optionalNumber('COMMUTE_WINDOW_MINUTES', 120),
    maxOptions: optionalNumber('COMMUTE_MAX_OPTIONS', 3),
  },

  // ── Google Calendar ───────────────────────────────────────────────────────
  // Option A (easiest): paste your private iCal (.ics) URL from Google Calendar
  //   Settings → [calendar] → "Secret address in iCal format"
  // Option B: Google API with a service-account JSON key file
  calendar: {
    icalUrl: optional('CALENDAR_ICAL_URL', ''),
    calendarId: optional('GOOGLE_CALENDAR_ID', ''),
    serviceAccountKeyFile: optional('GOOGLE_SERVICE_ACCOUNT_KEY_FILE', '/run/secrets/google_sa_key.json'),
    refreshMinutes: optionalNumber('REFRESH_CALENDAR_MINUTES', 5),
    lookAheadDays: optionalNumber('CALENDAR_LOOKAHEAD_DAYS', 14),
    // How many days of events to display in the widget (≤ lookAheadDays)
    displayDays: optionalNumber('CALENDAR_DISPLAY_DAYS', 14),
  },

  // ── Public Holidays (Nager.Date API — no key required) ───────────────────
  holidays: {
    country: optional('HOLIDAY_COUNTRY', 'CH'),
    town1: optional('HOLIDAY_TOWN_1', ''),   // e.g. "ZH" (canton code)
    town2: optional('HOLIDAY_TOWN_2', ''),
    // How many upcoming holidays to show in the widget
    maxItems: optionalNumber('HOLIDAYS_MAX_ITEMS', 8),
  },

  // ── RSS News Ticker ───────────────────────────────────────────────────────
  rss: {
    // Comma-separated list of RSS feed URLs
    feeds: optional('RSS_FEEDS', 'https://feeds.bbci.co.uk/news/world/rss.xml'),
    refreshMinutes: optionalNumber('REFRESH_RSS_MINUTES', 10),
    // Max headlines kept per feed
    maxItems: optionalNumber('RSS_MAX_ITEMS', 20),
    // How long each headline is shown in the ticker (seconds)
    itemDurationSeconds: optionalNumber('RSS_ITEM_DURATION_SECONDS', 10),
  },

  // ── METAR (Aviation Weather Center — no API key required) ────────────────
  metar: {
    icao: optional('METAR_ICAO', 'LSZH'),
    refreshMinutes: optionalNumber('METAR_REFRESH_MINUTES', 30),
  },

  // ── Persistent settings storage ──────────────────────────────────────────
  data: {
    path: optional('DATA_PATH', '/app/data'),
  },
};
