/**
 * METAR service — Aviation Weather Center (aviationweather.gov)
 * Free, no API key required.
 * Returns decoded METAR data for a given ICAO airport code.
 *
 * Resilience strategy:
 *  - Up to 3 attempts with exponential back-off (0 / 2 / 4 s)
 *  - On total failure, serves the last-known-good value from memory
 *    rather than propagating the error, so the widget stays populated.
 */
import axios, { AxiosError } from 'axios';
import { getCache, withCache } from './cache';
import { logger } from '../logger';

const BASE_URL = 'https://aviationweather.gov/api/data/metar';
const UA = 'TL-Dashboard/0.3 (https://github.com/techlotse/tl-dashboard-core)';

export interface SkyLayer {
  cover: string;       // CLR, SKC, FEW, SCT, BKN, OVC, OVX
  base: number | null; // feet AGL, null for CLR/SKC
}

export interface MetarData {
  icao: string;
  rawText: string;
  obsTime: string;      // ISO string
  temp: number | null;  // °C
  dewp: number | null;  // °C
  wdir: number | null;  // degrees (null = calm or variable)
  wspd: number | null;  // knots
  wgst: number | null;  // knots, null if no gust
  visib: string;        // statute miles as string (e.g. "10+", "1/4")
  altim: number | null; // hPa
  wx: string | null;    // present weather string (e.g. "-RA", "TSRA")
  skyConditions: SkyLayer[];
  flightCategory: string; // VFR | MVFR | IFR | LIFR
  fetchedAt: string;
  stale?: boolean;      // true when serving cached data after an API failure
}

const cache = getCache('metar', 30 * 60); // 30-min TTL

/** In-memory store of last successful response — survives cache expiry */
const lastKnown: Record<string, MetarData> = {};

function parseResponse(data: unknown, icao: string): MetarData {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error(`No METAR data found for ${icao.toUpperCase()}`);
  }

  const r = data[0];

  const skyConditions: SkyLayer[] = Array.isArray(r.clouds)
    ? r.clouds.map((s: { cover?: string; base?: number }) => ({
        cover: s.cover ?? 'CLR',
        base:  s.base  ?? null,
      }))
    : [];

  // wdir: 0 may mean calm (wspd=0) or northerly; treat calm as null
  const wspd = typeof r.wspd === 'number' ? r.wspd : null;
  const wdir = wspd === 0 ? null : (typeof r.wdir === 'number' ? r.wdir : null);

  // obsTime is a UNIX integer per the AWC OpenAPI spec; reportTime is ISO-like fallback
  const obsTime = typeof r.obsTime === 'number'
    ? new Date(r.obsTime * 1000).toISOString()
    : r.reportTime
      ? new Date(r.reportTime + ' UTC').toISOString()
      : new Date().toISOString();

  return {
    icao:           r.icaoId        ?? icao.toUpperCase(),
    rawText:        r.rawOb         ?? '',
    obsTime,
    temp:           typeof r.temp   === 'number' ? r.temp  : null,
    dewp:           typeof r.dewp   === 'number' ? r.dewp  : null,
    wdir,
    wspd,
    wgst:           typeof r.wgst   === 'number' ? r.wgst  : null,
    visib:          r.visib?.toString() ?? '',
    altim:          typeof r.altim  === 'number' ? Math.round(r.altim) : null,
    wx:             r.wxString      ?? null,
    skyConditions,
    flightCategory: (r.fltCat && typeof r.fltCat === 'string' && r.fltCat.trim())
                      ? r.fltCat.trim().toUpperCase()
                      : 'UNKN',
    fetchedAt:      new Date().toISOString(),
  };
}

async function fetchWithRetry(icao: string, maxAttempts = 3): Promise<MetarData> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const delayMs = attempt * 2000; // 2 s, 4 s
      logger.info(`METAR retry ${attempt}/${maxAttempts - 1} for ${icao.toUpperCase()} in ${delayMs}ms`);
      await new Promise(r => setTimeout(r, delayMs));
    }

    try {
      const { data } = await axios.get(BASE_URL, {
        params: { ids: icao.toUpperCase(), format: 'json', hours: 2 },
        headers: { 'User-Agent': UA },
        timeout: 10_000,
      });
      const result = parseResponse(data, icao);
      lastKnown[icao.toUpperCase()] = result; // update stale store
      return result;
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      logger.warn(`METAR fetch attempt ${attempt + 1} failed for ${icao.toUpperCase()}: ${status ?? err}`);
      lastError = err;
    }
  }

  // All attempts failed — return last known good data with stale flag
  const stale = lastKnown[icao.toUpperCase()];
  if (stale) {
    logger.warn(`Returning stale METAR for ${icao.toUpperCase()} after all retries failed`);
    return { ...stale, stale: true, fetchedAt: new Date().toISOString() };
  }

  throw lastError;
}

export async function fetchMetar(icao: string): Promise<MetarData> {
  const key = `metar-${icao.toUpperCase()}`;
  return withCache(cache, key, () => fetchWithRetry(icao));
}
