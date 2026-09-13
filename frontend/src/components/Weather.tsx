import { Wind, Droplets, Sunrise, Sunset, Umbrella, ArrowUp, ArrowDown, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import { FetchState, WeatherData, HourlyWeather, DailyWeather } from '../types';
import WeatherIcon from './WeatherIcon';

interface Props {
  state: FetchState<WeatherData>;
  /** IANA timezone of the dashboard — used to pick the "current hour" slot. */
  timezone?: string;
  scale?: number;
  onSettingsOpen?: () => void;
}

/** Hours between hourly slots — 2h × 9 slots covers the rest of a typical day. */
const HOUR_STEP = 2;
/** Slots rendered in a wide panel (portrait full-width); narrow panels show the first 6. */
const MAX_SLOTS = 9;

function Skeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-14 w-32 bg-white/10 rounded-lg" />
      <div className="h-4 w-24 bg-white/10 rounded" />
      <div className="flex gap-3 mt-4">
        {[1,2,3].map(i => <div key={i} className="h-20 w-20 bg-white/10 rounded-xl flex-1" />)}
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="text-red-400/80 text-sm p-2">
      <p className="font-medium">Weather unavailable</p>
      <p className="text-xs opacity-70 mt-1 font-mono">{error}</p>
    </div>
  );
}

function shortDay(dateStr: string): string {
  try { return format(parseISO(dateStr), 'EEE'); }
  catch { return dateStr.slice(5); }
}
function shortTime(isoStr: string): string {
  try { return format(parseISO(isoStr), 'HH:mm'); }
  catch { return ''; }
}
/** Two-letter weekday ("Mo") for compact hour labels. */
function dayMark(isoStr: string): string {
  try { return format(parseISO(isoStr), 'EEEEEE'); }
  catch { return ''; }
}

/**
 * Pick the hourly slots to show: starting at the current hour, every
 * HOUR_STEP hours, up to MAX_SLOTS. Rolls into tomorrow late in the day.
 * Hourly times are timezone-naive local strings ("2026-09-13T14:00"), so we
 * compare against the current local hour formatted the same way.
 */
function pickSlots(hourly: HourlyWeather[], timezone: string): HourlyWeather[] {
  const nowStr = formatTz(toZonedTime(new Date(), timezone), "yyyy-MM-dd'T'HH:00", { timeZone: timezone });
  let start = hourly.findIndex((h) => h.time >= nowStr);
  if (start < 0) start = 0;
  const slots: HourlyWeather[] = [];
  for (let i = start; i < hourly.length && slots.length < MAX_SLOTS; i += HOUR_STEP) {
    slots.push(hourly[i]);
  }
  return slots;
}

function HourSlot({ slot, isNow, today, hideNarrow }: {
  slot: HourlyWeather; isNow: boolean; today: string; hideNarrow: boolean;
}) {
  const sameDay = slot.time.slice(0, 10) === today;
  // Past midnight the label gains a 2-letter day marker ("Mo 01"), kept on one line.
  const label = isNow ? 'Now' : sameDay ? slot.time.slice(11, 13) : `${dayMark(slot.time)} ${slot.time.slice(11, 13)}`;
  const rain = slot.precipitationProbability;
  return (
    <div className={`flex-col items-center gap-1 rounded-lg py-1.5 ${isNow ? 'bg-white/[0.06]' : ''} ${hideNarrow ? 'hidden @2xl:flex' : 'flex'}`}>
      <div className={`text-[11px] font-medium tabular-nums tracking-wide whitespace-nowrap ${isNow ? 'text-white/80' : 'text-white/45'}`}>
        {label}
      </div>
      <WeatherIcon icon={slot.weatherIcon} size="md" />
      <div className="text-sm font-medium text-white tabular-nums">{slot.temperature}°</div>
      <div className={`text-[11px] tabular-nums flex items-center gap-0.5 ${rain > 0 ? 'text-blue-300' : 'text-white/20'}`}>
        <Umbrella size={9} strokeWidth={1.5} />
        {rain}%
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DailyWeather }) {
  return (
    <div className="flex-1 panel-tight p-2.5 flex flex-col items-center gap-1.5 min-w-0">
      <div className="text-xs font-medium text-white/50 uppercase tracking-wider">{shortDay(day.date)}</div>
      <WeatherIcon icon={day.weatherIcon} size="sm" />
      <div className="text-sm font-medium text-white tabular-nums">{day.temperatureMax}°</div>
      <div className="text-xs text-white/40 tabular-nums">{day.temperatureMin}°</div>
      {day.precipitationSum > 0 && (
        <div className="text-xs text-blue-300 flex items-center gap-0.5">
          <Droplets size={10} strokeWidth={1.5} />
          {day.precipitationSum.toFixed(1)}
        </div>
      )}
    </div>
  );
}

export default function Weather({ state, timezone = 'Europe/Zurich', scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 h-full flex flex-col gap-3 @container" style={{ zoom: scale }}>
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex-1">Weather</h2>
        {onSettingsOpen && (
          <button onClick={onSettingsOpen} className="text-white/20 hover:text-white/60 transition-colors" aria-label="Weather settings">
            <Settings size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <ErrorState error={state.error} />
      ) : (() => {
        const { current, hourly, todaySummary, forecast } = state.data;
        const slots = pickSlots(hourly, timezone);
        return (
          /*
            Wide panel (portrait, full width):  [ now ] | [ today, hourly ] | [ 3-day ]
            Narrow panel (landscape column):    stacked top-to-bottom
          */
          <div className="flex flex-col gap-4 @2xl:flex-row @2xl:gap-5 min-h-0 flex-1">

            {/* ── Now ────────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2.5 @2xl:w-[250px] @2xl:shrink-0 @2xl:justify-center">
              <div className="flex items-center gap-4">
                <WeatherIcon icon={current.weatherIcon} size="xl" />
                <div>
                  <div className="text-5xl font-light text-white tabular-nums leading-none">
                    {current.temperature}°
                  </div>
                  <div className="text-sm text-white/60 mt-1.5">{current.weatherDescription}</div>
                  <div className="text-xs text-white/40 mt-0.5">Feels like {current.feelsLike}°</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                <span className="flex items-center gap-1">
                  <Wind size={13} className="text-blue-300" strokeWidth={1.5} />
                  {current.windSpeed} km/h
                </span>
                <span className="flex items-center gap-1">
                  <Droplets size={13} className="text-blue-400" strokeWidth={1.5} />
                  {current.humidity}%
                </span>
                {current.precipitationProbability > 0 && (
                  <span className="flex items-center gap-1 text-blue-300">
                    <Umbrella size={13} strokeWidth={1.5} />
                    {current.precipitationProbability}%
                  </span>
                )}
              </div>

              {/* Today's range + sun */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45 tabular-nums">
                <span className="flex items-center gap-0.5">
                  <ArrowUp size={11} strokeWidth={2} className="text-orange-300/70" />
                  {todaySummary.temperatureMax}°
                  <ArrowDown size={11} strokeWidth={2} className="text-sky-300/70 ml-1.5" />
                  {todaySummary.temperatureMin}°
                </span>
                {todaySummary.sunrise && (
                  <span className="flex items-center gap-1.5">
                    <span className="flex items-center gap-0.5 text-yellow-300/60">
                      <Sunrise size={11} strokeWidth={1.5} />{shortTime(todaySummary.sunrise)}
                    </span>
                    <span className="flex items-center gap-0.5 text-orange-300/60">
                      <Sunset size={11} strokeWidth={1.5} />{shortTime(todaySummary.sunset)}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="hidden @2xl:block w-px self-stretch bg-white/[0.08]" />

            {/* ── Today — hourly ──────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5 @2xl:justify-center">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                Today
              </div>
              {slots.length === 0 ? (
                <div className="text-white/30 text-sm py-2">No hourly forecast</div>
              ) : (
                <div className="grid grid-flow-col auto-cols-fr gap-1">
                  {slots.map((slot, i) => (
                    <HourSlot
                      key={slot.time}
                      slot={slot}
                      isNow={i === 0}
                      today={todaySummary.date}
                      hideNarrow={i >= 6}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="hidden @2xl:block w-px self-stretch bg-white/[0.08]" />

            {/* ── Next 3 days ─────────────────────────────────────────────── */}
            <div className="flex gap-2 @2xl:w-[270px] @2xl:shrink-0 @2xl:items-center">
              {forecast.map((day) => <DayCard key={day.date} day={day} />)}
            </div>

          </div>
        );
      })()}
    </div>
  );
}
