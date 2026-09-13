/**
 * Persistent settings service.
 *
 * Saves user-configured overrides to DATA_PATH/settings.json.
 * Every field is optional — unset fields fall back to the env-var defaults
 * in config.ts via getEffectiveConfig().
 */
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../logger';

export interface SavedSettings {
  timezone?: string;
  weatherLat?: string;
  weatherLon?: string;
  stationName?: string;
  commuteToStation?: string;
  calendarIcalUrl?: string;
  calendarDisplayDays?: number;
  holidayCountry?: string;
  holidayTown1?: string;
  holidayTown2?: string;
  holidaysMaxItems?: number;
  rssFeeds?: string;
  rssItemDurationSeconds?: number;
  metarIcao?: string;
  // Per-widget scale (1.0 = 100%)
  scaleClock?: number;
  scaleWeather?: number;
  scaleTransport?: number;
  scaleCalendar?: number;
  scaleHolidays?: number;
  scaleMetar?: number;
  scaleNewsTicker?: number;
}

/** The full config shape returned to the frontend via /api/config */
export interface EffectiveConfig {
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
  // Per-widget scale (1.0 = 100%)
  scaleClock: number;
  scaleWeather: number;
  scaleTransport: number;
  scaleCalendar: number;
  scaleHolidays: number;
  scaleMetar: number;
  scaleNewsTicker: number;
  // read-only (not overridable from UI)
  refreshWeatherMinutes: number;
  refreshTransportSeconds: number;
  refreshCalendarMinutes: number;
  refreshRssMinutes: number;
  metarRefreshMinutes: number;
}

let _settings: SavedSettings = {};

function settingsFilePath(): string {
  return path.join(config.data.path, 'settings.json');
}

export function loadSettings(): void {
  try {
    fs.mkdirSync(config.data.path, { recursive: true });
    const raw = fs.readFileSync(settingsFilePath(), 'utf-8');
    _settings = JSON.parse(raw) as SavedSettings;
    logger.info('User settings loaded from file');
  } catch {
    _settings = {};
    logger.info('No saved settings found — using env var defaults');
  }
}

export function getSettings(): SavedSettings {
  return { ..._settings };
}

export function saveSettings(partial: SavedSettings): void {
  _settings = { ..._settings, ...partial };
  try {
    fs.mkdirSync(config.data.path, { recursive: true });
    fs.writeFileSync(settingsFilePath(), JSON.stringify(_settings, null, 2), 'utf-8');
    logger.info('User settings saved');
  } catch (err) {
    logger.error(`Failed to save settings: ${err}`);
    throw err;
  }
}

export function getEffectiveConfig(): EffectiveConfig {
  const s = _settings;
  return {
    timezone:                  s.timezone                  ?? config.timezone,
    stationName:               s.stationName               ?? config.transport.stationName,
    weatherLat:                s.weatherLat                ?? config.weather.lat,
    weatherLon:                s.weatherLon                ?? config.weather.lon,
    commuteToStation:          s.commuteToStation          ?? config.commute.toStation,
    calendarIcalUrl:           s.calendarIcalUrl           ?? config.calendar.icalUrl,
    calendarDisplayDays:       s.calendarDisplayDays       ?? config.calendar.displayDays,
    holidayCountry:            s.holidayCountry            ?? config.holidays.country,
    holidayTown1:              s.holidayTown1              ?? config.holidays.town1,
    holidayTown2:              s.holidayTown2              ?? config.holidays.town2,
    holidaysMaxItems:          s.holidaysMaxItems          ?? config.holidays.maxItems,
    rssFeeds:                  s.rssFeeds                  ?? config.rss.feeds,
    rssItemDurationSeconds:    s.rssItemDurationSeconds    ?? config.rss.itemDurationSeconds,
    metarIcao:                 s.metarIcao                 ?? config.metar.icao,
    // Per-widget scale — news ticker defaults to 1.25 for better TV legibility
    scaleClock:       s.scaleClock       ?? 1.0,
    scaleWeather:     s.scaleWeather     ?? 1.0,
    scaleTransport:   s.scaleTransport   ?? 1.0,
    scaleCalendar:    s.scaleCalendar    ?? 1.0,
    scaleHolidays:    s.scaleHolidays    ?? 1.0,
    scaleMetar:       s.scaleMetar       ?? 1.0,
    scaleNewsTicker:  s.scaleNewsTicker  ?? 1.25,
    // refresh intervals are env-only
    refreshWeatherMinutes:     config.weather.refreshMinutes,
    refreshTransportSeconds:   config.transport.refreshSeconds,
    refreshCalendarMinutes:    config.calendar.refreshMinutes,
    refreshRssMinutes:         config.rss.refreshMinutes,
    metarRefreshMinutes:       config.metar.refreshMinutes,
  };
}
