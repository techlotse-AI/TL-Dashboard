import { Wind, Droplets, Sunrise, Sunset, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FetchState, WeatherData } from '../types';
import WeatherIcon from './WeatherIcon';

interface Props {
  state: FetchState<WeatherData>;
  scale?: number;
  onSettingsOpen?: () => void;
}

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

export default function Weather({ state, scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 h-full flex flex-col gap-3" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` }}>
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
      ) : (
        <>
          {/* Current conditions */}
          <div className="flex items-center gap-4">
            <WeatherIcon icon={state.data.current.weatherIcon} size="xl" />
            <div>
              <div className="text-5xl font-light text-white tabular-nums">
                {state.data.current.temperature}°
              </div>
              <div className="text-sm text-white/60 mt-0.5">
                {state.data.current.weatherDescription}
              </div>
              <div className="text-xs text-white/40 mt-0.5">
                Feels like {state.data.current.feelsLike}°
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 text-sm text-white/60">
            <span className="flex items-center gap-1">
              <Wind size={13} className="text-blue-300" strokeWidth={1.5} />
              {state.data.current.windSpeed} km/h
            </span>
            <span className="flex items-center gap-1">
              <Droplets size={13} className="text-blue-400" strokeWidth={1.5} />
              {state.data.current.humidity}%
            </span>
          </div>

          {/* 3-day forecast */}
          <div className="flex gap-2 mt-1">
            {state.data.forecast.map((day) => (
              <div
                key={day.date}
                className="flex-1 panel-tight p-2.5 flex flex-col items-center gap-1.5"
              >
                <div className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  {shortDay(day.date)}
                </div>
                <WeatherIcon icon={day.weatherIcon} size="sm" />
                <div className="text-sm font-medium text-white tabular-nums">
                  {day.temperatureMax}°
                </div>
                <div className="text-xs text-white/40 tabular-nums">
                  {day.temperatureMin}°
                </div>
                {day.precipitationSum > 0 && (
                  <div className="text-xs text-blue-300 flex items-center gap-0.5">
                    <Droplets size={10} strokeWidth={1.5} />
                    {day.precipitationSum.toFixed(1)}
                  </div>
                )}
                {/* Sunrise / sunset */}
                {day.sunrise && (
                  <div className="flex flex-col items-center gap-0.5 mt-0.5">
                    <span className="text-[10px] text-yellow-300/60 flex items-center gap-0.5">
                      <Sunrise size={9} strokeWidth={1.5} />
                      {shortTime(day.sunrise)}
                    </span>
                    <span className="text-[10px] text-orange-300/60 flex items-center gap-0.5">
                      <Sunset size={9} strokeWidth={1.5} />
                      {shortTime(day.sunset)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
