/**
 * Calendar service — supports two auth methods, tried in order:
 *
 * ── Option A: iCal URL (EASIEST — recommended for Google Calendar) ──────────
 *  1. Open Google Calendar → Settings → click your calendar name
 *  2. Scroll to "Secret address in iCal format" → copy the URL
 *  3. Set in .env:  CALENDAR_ICAL_URL=https://calendar.google.com/calendar/ical/...
 *  No API key, no service account, no OAuth needed.
 *
 * ── Option B: Google API service account ─────────────────────────────────────
 *  Set GOOGLE_CALENDAR_ID + GOOGLE_SERVICE_ACCOUNT_KEY_FILE (see README).
 *
 * ── Option C: Google API OAuth2 ──────────────────────────────────────────────
 *  Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN.
 */
import axios from 'axios';
import ical from 'node-ical';
import { google } from 'googleapis';
import fs from 'fs';
import { config } from '../config';
import { getEffectiveConfig } from './settingsService';
import { getCache, withCache } from './cache';
import { logger } from '../logger';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO string
  end: string;          // ISO string
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

const cache = getCache('calendar', config.calendar.refreshMinutes * 60);

// ── iCal fetcher ───────────────────────────────────────────────────────────────
async function fetchFromIcal(url: string): Promise<CalendarEvent[]> {
  logger.info(`Fetching calendar via iCal: ${url.split('?')[0]}…`);

  // Download the .ics file
  const { data: icsText } = await axios.get<string>(url, {
    timeout: 15000,
    responseType: 'text',
    headers: { 'Accept': 'text/calendar' },
  });

  const parsed = ical.parseICS(icsText);

  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + config.calendar.lookAheadDays);

  const events: CalendarEvent[] = [];

  for (const key of Object.keys(parsed)) {
    const component = parsed[key];
    // CalendarResponse values can be undefined (vcalendar key) or VCalendar
    if (!component || component.type !== 'VEVENT') continue;

    // Cast to VEvent after the type guard — node-ical's CalendarComponent union
    // includes VCalendar which lacks start/end/summary, so we narrow explicitly.
    const ev = component as ical.VEvent;

    // node-ical puts Date objects directly on start/end
    const startRaw = ev.start as unknown as Date | string | undefined;
    const endRaw   = ev.end   as unknown as Date | string | undefined;

    if (!startRaw) continue;

    const startDate = startRaw instanceof Date ? startRaw : new Date(startRaw as string);
    const endDate   = endRaw instanceof Date   ? endRaw   : new Date((endRaw ?? startDate) as string | Date);

    // Skip events entirely in the past
    if (endDate < now) continue;
    // Skip events too far in the future
    if (startDate > maxDate) continue;

    // Detect all-day: node-ical sets datetype = 'date' for all-day events
    const allDay = (ev as unknown as Record<string, unknown>).datetype === 'date' || (
      startDate.getHours() === 0 && startDate.getMinutes() === 0 &&
      startDate.getSeconds() === 0 && startDate.getMilliseconds() === 0 &&
      typeof startRaw === 'string' && !startRaw.includes('T')
    );

    events.push({
      id: ev.uid ?? key,
      title: (ev.summary as string | undefined) ?? '(no title)',
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      allDay,
      location: (ev.location as string | undefined) ?? undefined,
      description: (ev.description as string | undefined) ?? undefined,
    });
  }

  // Sort by start time
  events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  logger.info(`iCal: loaded ${events.length} upcoming event(s)`);
  return events;
}

// ── Google Calendar API fetcher ────────────────────────────────────────────────
function buildGoogleAuth() {
  const keyFile = config.calendar.serviceAccountKeyFile;
  if (keyFile && fs.existsSync(keyFile)) {
    logger.debug('Google Calendar: using service account');
    return new google.auth.GoogleAuth({
      keyFile,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });
  }
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    logger.debug('Google Calendar: using OAuth2');
    const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
    oauth2.setCredentials({ refresh_token: refreshToken });
    return oauth2;
  }
  return null;
}

async function fetchFromGoogleApi(calendarId: string): Promise<CalendarEvent[]> {
  const auth = buildGoogleAuth();
  if (!auth) {
    logger.warn('No Google Calendar credentials configured');
    return [];
  }
  const cal = google.calendar({ version: 'v3', auth: auth as any });
  const now = new Date();
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + config.calendar.lookAheadDays);
  const res = await cal.events.list({
    calendarId,
    timeMin: now.toISOString(),
    timeMax: maxDate.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 50,
  });
  return (res.data.items ?? []).map((item) => ({
    id: item.id ?? '',
    title: item.summary ?? '(no title)',
    start: item.start?.dateTime ?? item.start?.date ?? '',
    end:   item.end?.dateTime   ?? item.end?.date   ?? '',
    allDay: !item.start?.dateTime,
    location: item.location ?? undefined,
    description: item.description ?? undefined,
    color: item.colorId ?? undefined,
  }));
}

// ── Public entry point ─────────────────────────────────────────────────────────
export async function fetchCalendarEvents(): Promise<CalendarData> {
  // Determine which source to use — UI-saved settings override env defaults
  const cfg = getEffectiveConfig();
  const icalUrl    = cfg.calendarIcalUrl || config.calendar.icalUrl;
  const calendarId = config.calendar.calendarId;

  if (!icalUrl && !calendarId) {
    logger.warn('No calendar configured (set CALENDAR_ICAL_URL or GOOGLE_CALENDAR_ID)');
    return { events: [], calendarId: '', fetchedAt: new Date().toISOString() };
  }

  const cacheKey = icalUrl ? `ical-${icalUrl}` : `gcal-${calendarId}`;

  return withCache(cache, cacheKey, async () => {
    let events: CalendarEvent[];

    if (icalUrl) {
      events = await fetchFromIcal(icalUrl);
    } else {
      logger.info(`Fetching Google Calendar events for: ${calendarId}`);
      events = await fetchFromGoogleApi(calendarId);
    }

    return {
      events,
      calendarId: icalUrl ? icalUrl.split('?')[0] : calendarId,
      fetchedAt: new Date().toISOString(),
    };
  });
}
