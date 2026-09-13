import { useEffect, useState } from 'react';
import Clock from './components/Clock';
import Weather from './components/Weather';
import Transport from './components/Transport';
import CalendarWidget from './components/CalendarWidget';
import Holidays from './components/Holidays';
import NewsTicker from './components/NewsTicker';
import MetarWidget from './components/MetarWidget';
import SettingsPanel from './components/SettingsPanel';
import { useAutoRefresh } from './hooks/useAutoRefresh';
import {
  AppConfig,
  WeatherData,
  TransportData,
  CalendarData,
  HolidayData,
  RssData,
  MetarData,
} from './types';

// Default config — overridden once /api/config loads
const DEFAULT_CONFIG: AppConfig = {
  timezone: 'Europe/Zurich',
  stationName: 'Station',
  weatherLat: '47.3769',
  weatherLon: '8.5417',
  commuteToStation: '',
  calendarIcalUrl: '',
  calendarDisplayDays: 14,
  holidayCountry: 'CH',
  holidayTown1: '',
  holidayTown2: '',
  holidaysMaxItems: 8,
  rssFeeds: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  rssItemDurationSeconds: 10,
  metarIcao: 'LSZH',
  scaleClock: 1.0,
  scaleWeather: 1.0,
  scaleTransport: 1.0,
  scaleCalendar: 1.0,
  scaleHolidays: 1.0,
  scaleMetar: 1.0,
  scaleNewsTicker: 1.25,
  refreshWeatherMinutes: 30,
  refreshTransportSeconds: 60,
  refreshCalendarMinutes: 5,
  refreshRssMinutes: 10,
  metarRefreshMinutes: 30,
};

const API = '/api';

export default function App() {
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsWidget, setSettingsWidget] = useState<string>('weather');

  // Load server config once on mount
  useEffect(() => {
    fetch(`${API}/config`)
      .then((r) => r.json())
      .then((cfg: AppConfig) => setAppConfig(cfg))
      .catch(() => {/* use defaults */});
  }, []);

  function openSettings(widget: string) {
    setSettingsWidget(widget);
    setSettingsOpen(true);
  }

  // ── Data fetches ──────────────────────────────────────────────────────────
  const weather = useAutoRefresh<WeatherData>(
    `${API}/weather`,
    appConfig.refreshWeatherMinutes * 60 * 1000,
  );

  const transport = useAutoRefresh<TransportData>(
    `${API}/transport`,
    appConfig.refreshTransportSeconds * 1000,
  );

  const calendar = useAutoRefresh<CalendarData>(
    `${API}/calendar`,
    appConfig.refreshCalendarMinutes * 60 * 1000,
  );

  const holidays = useAutoRefresh<HolidayData>(
    `${API}/holidays`,
    60 * 60 * 1000, // hourly — holidays are stable
  );

  const rss = useAutoRefresh<RssData>(
    `${API}/rss`,
    appConfig.refreshRssMinutes * 60 * 1000,
  );

  const metar = useAutoRefresh<MetarData>(
    `${API}/metar`,
    appConfig.metarRefreshMinutes * 60 * 1000,
  );

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0e1a] text-white select-none">
      {/* ── Backdrop — static gradient + bottom vignette ──────────────────── */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1220 100%)' }}
      >
        <div
          className="absolute inset-x-0 bottom-0 h-32"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}
        />
      </div>

      {/* ── Main layout grid ─────────────────────────────────────────────── */}
      {/*
        The grid is orientation-aware (see `.dash-grid` in index.css):

        Landscape — 1920×1080 wall display (primary)     Portrait — 1080×1920
        ┌──────────────────────┬──────────┐              ┌──────────┬──────────┐
        │  Weather             │  Clock   │              │  Clock   │  METAR   │
        │  now · today · 3 days│          │              ├──────────┴──────────┤
        ├───────────┬──────────┼──────────┤              │  Weather            │
        │  Calendar │  SBB     │ Holidays │              ├──────────┬──────────┤
        │           │          ├──────────┤              │ Calendar │  SBB     │
        │           │          │  METAR   │              │          ├──────────┤
        └───────────┴──────────┴──────────┘              │          │ Holidays │
        └────────── NEWS TICKER ──────────┘              └──────────┴──────────┘

        Each cell is a named grid area; widgets fill their cell with `h-full`.
        Per-widget scale uses CSS `zoom`, so bigger content never overflows the cell.
      */}
      <div className="dash-shell absolute inset-0 z-10">
        <div className="dash-grid">

          <div className="dash-area-clock panel px-5 py-4 flex items-center min-h-0 min-w-0">
            <Clock config={appConfig} scale={appConfig.scaleClock} onSettingsOpen={() => openSettings('clock')} />
          </div>

          <div className="dash-area-weather min-h-0 min-w-0">
            <Weather
              state={weather}
              timezone={appConfig.timezone}
              scale={appConfig.scaleWeather}
              onSettingsOpen={() => openSettings('weather')}
            />
          </div>

          <div className="dash-area-calendar min-h-0 min-w-0">
            <CalendarWidget
              state={calendar}
              displayDays={appConfig.calendarDisplayDays}
              scale={appConfig.scaleCalendar}
              onSettingsOpen={() => openSettings('calendar')}
            />
          </div>

          <div className="dash-area-transport min-h-0 min-w-0">
            <Transport state={transport} scale={appConfig.scaleTransport} onSettingsOpen={() => openSettings('transport')} />
          </div>

          <div className="dash-area-holidays min-h-0 min-w-0">
            <Holidays
              state={holidays}
              town1={appConfig.holidayTown1}
              town2={appConfig.holidayTown2}
              maxItems={appConfig.holidaysMaxItems}
              scale={appConfig.scaleHolidays}
              onSettingsOpen={() => openSettings('holidays')}
            />
          </div>

          <div className="dash-area-metar min-h-0 min-w-0">
            <MetarWidget
              state={metar}
              scale={appConfig.scaleMetar}
              onSettingsOpen={() => openSettings('metar')}
            />
          </div>

        </div>
      </div>

      {/* ── News ticker — fixed at the bottom ─────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20"
        style={{ padding: 'clamp(6px, 0.8vw, 16px)' }}
      >
        <NewsTicker
          state={rss}
          itemDurationMs={appConfig.rssItemDurationSeconds * 1000}
          scale={appConfig.scaleNewsTicker}
          onSettingsOpen={() => openSettings('rss')}
        />
      </div>

      {/* ── Settings panel ────────────────────────────────────────────────── */}
      <SettingsPanel
        open={settingsOpen}
        initialWidget={settingsWidget}
        config={appConfig}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
