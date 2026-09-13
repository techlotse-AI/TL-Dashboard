// ── API response types ────────────────────────────────────────────────────────

export interface AppConfig {
  // configurable from settings panel
  timezone: string;
  stationName: string;
  weatherLat: string;
  weatherLon: string;
  commuteToStation: string;
  calendarIcalUrl: string;
  calendarDisplayDays: number;
  holidayCountry: string;
  holidayTown1: string;
  holidayTown2: string;
  holidaysMaxItems: number;
  rssFeeds: string;
  rssItemDurationSeconds: number;
  metarIcao: string;
  // Per-widget scale (1.0 = 100%, 1.25 = 125%, etc.)
  scaleClock: number;
  scaleWeather: number;
  scaleTransport: number;
  scaleCalendar: number;
  scaleHolidays: number;
  scaleMetar: number;
  scaleNewsTicker: number;
  // read-only (env-var only)
  refreshWeatherMinutes: number;
  refreshTransportSeconds: number;
  refreshCalendarMinutes: number;
  refreshRssMinutes: number;
  metarRefreshMinutes: number;
}

// Settings saved via /api/settings
export type SavedSettings = Partial<Omit<AppConfig,
  'refreshWeatherMinutes'|'refreshTransportSeconds'|
  'refreshCalendarMinutes'|'refreshRssMinutes'|'metarRefreshMinutes'
>>;

// METAR
export interface SkyLayer { cover: string; base: number | null; }
export interface MetarData {
  icao: string;
  rawText: string;
  obsTime: string;
  temp: number | null;
  dewp: number | null;
  wdir: number | null;
  wspd: number | null;
  wgst: number | null;
  visib: string;
  altim: number | null;
  wx: string | null;
  skyConditions: SkyLayer[];
  flightCategory: string;
  fetchedAt: string;
  stale?: boolean;
}

// Weather
export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  precipitationProbability: number;
}
export interface HourlyWeather {
  time: string;
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  windSpeed: number;
  humidity: number;
}
export interface DailyWeather {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  weatherCode: number;
  weatherDescription: string;
  weatherIcon: string;
  sunrise: string;
  sunset: string;
}
export interface WeatherData {
  current: CurrentWeather;
  /** Hourly forecast for today and tomorrow (local time). */
  hourly: HourlyWeather[];
  /** Today's hi/lo and sunrise/sunset. */
  todaySummary: DailyWeather;
  /** Next 3 days (today excluded). */
  forecast: DailyWeather[];
  location: { lat: string; lon: string };
  fetchedAt: string;
}

// Transport
export interface Departure {
  departure: string;
  delay: number | null;
  platform: string | null;
  destination: string;
  trainType: string;
  trainNumber: string;
  cancelled: boolean;
  realtimeDeparture: string | null;
}
export interface CommuteLeg {
  name: string;
  category: string;
  departure: string;       // ISO timestamp
  arrival: string;         // ISO timestamp
  departureStation: string | null;
  arrivalStation: string | null;
  departurePlatform: string | null;
  arrivalPlatform: string | null;
}
export interface CommuteConnection {
  departure: string;
  arrival: string;
  duration: string;
  durationMinutes: number | null;
  transfers: number;
  fromPlatform: string | null;
  toPlatform: string | null;
  products: string[];
  legs: CommuteLeg[];
}
export interface CommuteWindow {
  label: 'outbound' | 'return';
  from: string;
  to: string;
  date: string;
  targetTime: string;
  options: CommuteConnection[];
  error?: string;
}
export interface CommuteData {
  from: string;
  to: string;
  departureTime: string;
  returnTime: string;
  outbound: CommuteWindow;
  inbound: CommuteWindow;
  fetchedAt: string;
}
export interface TransportData {
  stationName: string;
  stationId: string;
  departures: Departure[];
  commute: CommuteData | null;
  fetchedAt: string;
}

// Calendar
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  color?: string;
}
export interface CalendarData {
  events: CalendarEvent[];
  calendarId: string;
  fetchedAt: string;
}

// Holidays
export interface PublicHoliday {
  date: string;
  name: string;
  localName: string;
  isNational: boolean;
  counties: string[] | null;
  relevantTowns: string[];
}
export interface HolidayData {
  holidays: PublicHoliday[];
  year: number;
  country: string;
  fetchedAt: string;
}

// RSS
export interface NewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  source: string;
}
export interface RssData {
  items: NewsItem[];
  fetchedAt: string;
}

// Generic fetch state
export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };
