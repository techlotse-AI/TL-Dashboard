/**
 * Weather service using Open-Meteo (https://open-meteo.com/)
 * — completely free, no API key required.
 * Fetches hourly data for today + tomorrow, plus daily summaries for today and the next 3 days.
 */
import axios from 'axios';
import { config } from '../config';
import { getEffectiveConfig } from './settingsService';
import { getCache, withCache } from './cache';
import { logger } from '../logger';

const BASE_URL = 'https://api.open-meteo.com/v1/forecast';

// WMO Weather interpretation codes → human-readable description + icon name
export const WMO_CODES: Record<number, { description: string; icon: string }> = {
  0:  { description: 'Clear sky',                    icon: 'sun' },
  1:  { description: 'Mainly clear',                 icon: 'sun' },
  2:  { description: 'Partly cloudy',                icon: 'cloud-sun' },
  3:  { description: 'Overcast',                     icon: 'cloud' },
  45: { description: 'Foggy',                        icon: 'cloud-fog' },
  48: { description: 'Icy fog',                      icon: 'cloud-fog' },
  51: { description: 'Light drizzle',                icon: 'cloud-drizzle' },
  53: { description: 'Drizzle',                      icon: 'cloud-drizzle' },
  55: { description: 'Heavy drizzle',                icon: 'cloud-drizzle' },
  61: { description: 'Slight rain',                  icon: 'cloud-rain' },
  63: { description: 'Rain',                         icon: 'cloud-rain' },
  65: { description: 'Heavy rain',                   icon: 'cloud-rain-heavy' },
  71: { description: 'Slight snow',                  icon: 'cloud-snow' },
  73: { description: 'Snow',                         icon: 'cloud-snow' },
  75: { description: 'Heavy snow',                   icon: 'cloud-snow' },
  77: { description: 'Snow grains',                  icon: 'cloud-snow' },
  80: { description: 'Slight showers',               icon: 'cloud-showers' },
  81: { description: 'Showers',                      icon: 'cloud-showers' },
  82: { description: 'Violent showers',              icon: 'cloud-showers-heavy' },
  85: { description: 'Slight snow showers',          icon: 'cloud-snow' },
  86: { description: 'Heavy snow showers',           icon: 'cloud-snow' },
  95: { description: 'Thunderstorm',                 icon: 'cloud-lightning' },
  96: { description: 'Thunderstorm w/ slight hail',  icon: 'cloud-lightning' },
  99: { description: 'Thunderstorm w/ heavy hail',   icon: 'cloud-lightning' },
};

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
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    weatherDescription: string;
    weatherIcon: string;
    precipitationProbability: number;
  };
  /** Hourly forecast for today and tomorrow (48 entries, local time). */
  hourly: HourlyWeather[];
  /** Daily summary for today — hi/lo, sunrise/sunset. */
  todaySummary: DailyWeather;
  /** Daily summary for the next 3 days (today excluded). */
  forecast: DailyWeather[];
  location: { lat: string; lon: string };
  fetchedAt: string;
}

const cache = getCache('weather', config.weather.refreshMinutes * 60);

export async function fetchWeather(): Promise<WeatherData> {
  const cfg = getEffectiveConfig();
  const cacheKey = `weather-${cfg.weatherLat}-${cfg.weatherLon}`;
  return withCache(cache, cacheKey, async () => {
    logger.info(`Fetching weather for lat=${cfg.weatherLat}, lon=${cfg.weatherLon}`);

    const { data } = await axios.get(BASE_URL, {
      params: {
        latitude: cfg.weatherLat,
        longitude: cfg.weatherLon,
        hourly: [
          'temperature_2m',
          'relative_humidity_2m',
          'precipitation_probability',
          'precipitation',
          'weather_code',
          'wind_speed_10m',
        ].join(','),
        daily: [
          'weather_code',
          'temperature_2m_max',
          'temperature_2m_min',
          'precipitation_sum',
          'sunrise',
          'sunset',
        ].join(','),
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'weather_code',
          'wind_speed_10m',
          'precipitation',
        ].join(','),
        timezone: cfg.timezone,
        forecast_days: 4,
      },
      timeout: 10000,
    });

    // Open-Meteo returns dates/times in the requested timezone, so use its own
    // daily calendar rather than the server's UTC clock to decide what "today" is.
    const dailyDates: string[] = data.daily.time;
    const todayStr: string    = dailyDates[0];
    const tomorrowStr: string = dailyDates[1] ?? '';

    // Hourly for today + tomorrow — the widget picks "from now" on the client
    const hourly: HourlyWeather[] = [];
    const times: string[] = data.hourly.time;
    for (let i = 0; i < times.length; i++) {
      const day = times[i].slice(0, 10);
      if (day !== todayStr && day !== tomorrowStr) continue;
      const code = data.hourly.weather_code[i] ?? 0;
      hourly.push({
        time: times[i],
        temperature: Math.round(data.hourly.temperature_2m[i]),
        precipitation: data.hourly.precipitation[i] ?? 0,
        precipitationProbability: data.hourly.precipitation_probability?.[i] ?? 0,
        weatherCode: code,
        weatherDescription: WMO_CODES[code]?.description ?? 'Unknown',
        weatherIcon: WMO_CODES[code]?.icon ?? 'cloud',
        windSpeed: Math.round(data.hourly.wind_speed_10m[i]),
        humidity: data.hourly.relative_humidity_2m[i] ?? 0,
      });
    }

    const toDaily = (i: number): DailyWeather => {
      const code = data.daily.weather_code[i] ?? 0;
      return {
        date: dailyDates[i],
        temperatureMax: Math.round(data.daily.temperature_2m_max[i]),
        temperatureMin: Math.round(data.daily.temperature_2m_min[i]),
        precipitationSum: data.daily.precipitation_sum[i] ?? 0,
        weatherCode: code,
        weatherDescription: WMO_CODES[code]?.description ?? 'Unknown',
        weatherIcon: WMO_CODES[code]?.icon ?? 'cloud',
        sunrise: data.daily.sunrise[i] ?? '',
        sunset: data.daily.sunset[i] ?? '',
      };
    };

    // Today's own summary (hi/lo, sunrise/sunset) + 3-day forecast (today excluded)
    const todaySummary = toDaily(0);
    const forecast: DailyWeather[] = [];
    for (let i = 1; i < dailyDates.length && forecast.length < 3; i++) {
      forecast.push(toDaily(i));
    }

    const cur = data.current;
    const curCode = cur.weather_code ?? 0;

    // Precipitation probability isn't in Open-Meteo's `current` block —
    // take it from the hourly slot that contains the current observation time.
    const curHour: string = String(cur.time ?? '').slice(0, 13);
    const curIdx = curHour ? times.findIndex((t) => t.startsWith(curHour)) : -1;
    const curPrecipProb: number = curIdx >= 0 ? (data.hourly.precipitation_probability?.[curIdx] ?? 0) : 0;

    return {
      current: {
        temperature: Math.round(cur.temperature_2m),
        feelsLike: Math.round(cur.apparent_temperature),
        humidity: cur.relative_humidity_2m,
        windSpeed: Math.round(cur.wind_speed_10m),
        weatherCode: curCode,
        weatherDescription: WMO_CODES[curCode]?.description ?? 'Unknown',
        weatherIcon: WMO_CODES[curCode]?.icon ?? 'cloud',
        precipitationProbability: curPrecipProb,
      },
      hourly,
      todaySummary,
      forecast,
      location: { lat: cfg.weatherLat, lon: cfg.weatherLon },
      fetchedAt: new Date().toISOString(),
    };
  });
}
