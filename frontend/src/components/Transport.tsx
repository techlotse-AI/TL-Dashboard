import { Train, Clock, AlertTriangle, Ban, Route, ArrowRight, Briefcase, Home, Settings } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { FetchState, TransportData, Departure, CommuteConnection, CommuteWindow } from '../types';

interface Props {
  state: FetchState<TransportData>;
  scale?: number;
  onSettingsOpen?: () => void;
}

function depTime(dep: Departure): string {
  const base = dep.realtimeDeparture || dep.departure;
  if (!base) return '--:--';
  try { return format(parseISO(base), 'HH:mm'); }
  catch { return '--:--'; }
}

function plannedTime(dep: Departure): string {
  if (!dep.departure) return '';
  try { return format(parseISO(dep.departure), 'HH:mm'); }
  catch { return ''; }
}

function formatTime(isoStr: string): string {
  if (!isoStr) return '--:--';
  try { return format(parseISO(isoStr), 'HH:mm'); }
  catch { return '--:--'; }
}

function dateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE d MMM');
  } catch {
    return dateStr;
  }
}

function durationLabel(option: CommuteConnection): string {
  if (option.durationMinutes === null) return '';
  const hours = Math.floor(option.durationMinutes / 60);
  const minutes = option.durationMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function lineSummary(option: CommuteConnection): string {
  const lines = option.products.length > 0
    ? option.products
    : option.legs.map((leg) => leg.name);
  return Array.from(new Set(lines.filter(Boolean))).slice(0, 3).join(' + ') || 'Train';
}

/** For connections with transfers, build a "via X" label from leg station names */
function viaLabel(option: CommuteConnection): string | null {
  if (option.transfers === 0 || option.legs.length < 2) return null;
  // The transfer station is where the first leg arrives / second leg departs
  const transferStop =
    option.legs[0]?.arrivalStation ??
    option.legs[1]?.departureStation ??
    null;
  if (!transferStop) return null;
  return option.transfers === 1 ? `via ${transferStop}` : `via ${transferStop} +${option.transfers - 1}`;
}

const TRAIN_COLORS: Record<string, string> = {
  IC:  'bg-red-800/80 text-red-100',
  ICE: 'bg-red-700/80 text-red-100',
  IR:  'bg-orange-700/80 text-orange-100',
  RE:  'bg-green-800/80 text-green-100',
  S:   'bg-blue-800/80 text-blue-100',
  EC:  'bg-purple-800/80 text-purple-100',
};

function TrainBadge({ type }: { type: string }) {
  const cls = TRAIN_COLORS[type] ?? 'bg-white/10 text-white/70';
  return (
    <span className={`badge font-mono text-[10px] ${cls} px-1.5 py-0.5 rounded`}>
      {type || '?'}
    </span>
  );
}

function DelayBadge({ delay }: { delay: number | null }) {
  if (delay === null || delay === 0) return null;
  const color = delay > 5 ? 'text-red-400' : 'text-yellow-400';
  return (
    <span className={`text-xs font-mono ${color} flex items-center gap-0.5`}>
      <AlertTriangle size={11} strokeWidth={2} />
      +{delay}'
    </span>
  );
}

function ConnectionRow({ option }: { option: CommuteConnection }) {
  const via = viaLabel(option);
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.04]">
      <div className="font-mono tabular-nums leading-tight">
        <div className="text-sm font-semibold text-white">{formatTime(option.departure)}</div>
        <div className="text-xs text-white/35">{formatTime(option.arrival)}</div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white/90">{lineSummary(option)}</div>
        <div className="flex items-center gap-2 truncate text-xs text-white/35">
          {durationLabel(option) && <span>{durationLabel(option)}</span>}
          <span>{option.transfers === 0 ? 'direct' : `${option.transfers}×`}</span>
          {via && <span className="truncate text-white/25">{via}</span>}
        </div>
      </div>
      <div className="flex min-w-[42px] justify-end gap-1 text-xs text-white/35">
        {option.fromPlatform && (
          <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono">{option.fromPlatform}</span>
        )}
      </div>
    </div>
  );
}

function CommuteWindowView({ window }: { window: CommuteWindow }) {
  const Icon = window.label === 'outbound' ? Briefcase : Home;
  const title = window.label === 'outbound' ? 'Outbound' : 'Return';

  return (
    <div className="panel-tight p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/40">
            <Icon size={11} strokeWidth={2} />
            {title}
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-sm font-medium text-white/80">
            <span className="truncate">{window.from}</span>
            <ArrowRight size={12} className="shrink-0 text-white/30" strokeWidth={1.8} />
            <span className="truncate">{window.to}</span>
          </div>
        </div>
        <div className="shrink-0 text-right font-mono text-xs tabular-nums text-white/35">
          <div>{dateLabel(window.date)}</div>
          <div>{window.targetTime}</div>
        </div>
      </div>

      {window.error ? (
        <div className="rounded-lg bg-red-500/[0.08] px-2 py-1.5 text-xs text-red-300/80">
          Route unavailable
        </div>
      ) : window.options.length === 0 ? (
        <div className="rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs text-white/35">
          No route options found
        </div>
      ) : (
        <div className="flex flex-col gap-0.5">
          {window.options.slice(0, 3).map((option) => (
            <ConnectionRow key={`${option.departure}-${option.arrival}-${lineSummary(option)}`} option={option} />
          ))}
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1,2,3,4,5].map(i => (
        <div key={i} className="h-9 bg-white/10 rounded-lg" />
      ))}
    </div>
  );
}

export default function Transport({ state, scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 h-full flex flex-col gap-3" style={{ zoom: scale }}>
      <div className="flex items-center gap-1.5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-1.5 flex-1">
          <Route size={12} strokeWidth={2} />
          SBB
        </h2>
        {state.status === 'success' && (
          <span className="text-xs text-white/30 flex items-center gap-1">
            <Train size={11} strokeWidth={1.5} />
            {state.data.stationName}
          </span>
        )}
        {onSettingsOpen && (
          <button onClick={onSettingsOpen} className="text-white/20 hover:text-white/60 transition-colors" aria-label="Transport settings">
            <Settings size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <div className="text-red-400/80 text-sm">
          <p className="font-medium">Departures unavailable</p>
          <p className="text-xs opacity-70 mt-1 font-mono">{state.error}</p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 flex flex-col gap-3">
          {state.data.commute && (
            <div className="grid gap-2">
              <CommuteWindowView window={state.data.commute.outbound} />
              <CommuteWindowView window={state.data.commute.inbound} />
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-white/30">
              Departures
            </div>
            <div className="flex flex-col gap-1">
              {state.data.departures.length === 0 && (
                <div className="text-white/40 text-sm text-center py-4">No departures found</div>
              )}
              {/* No cap — the list container clips whatever doesn't fit the panel */}
              {state.data.departures.map((dep, i) => (
                <div
                  key={`${dep.departure}-${dep.destination}-${i}`}
                  className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm
                    ${dep.cancelled ? 'opacity-50' : 'hover:bg-white/[0.04]'}`}
                >
                  {/* Time */}
                  <div className="w-12 shrink-0 text-right">
                    <span className={`font-mono font-medium tabular-nums ${dep.cancelled ? 'line-through text-white/30' : 'text-white'}`}>
                      {depTime(dep)}
                    </span>
                    {dep.delay !== null && dep.delay !== 0 && (
                      <div className="text-[10px] text-white/30 line-through font-mono">
                        {plannedTime(dep)}
                      </div>
                    )}
                  </div>

                  {/* Train */}
                  <TrainBadge type={dep.trainType} />

                  {/* Number */}
                  <span className="text-white/40 font-mono text-xs w-10 shrink-0">
                    {dep.trainNumber}
                  </span>

                  {/* Destination */}
                  <span className="flex-1 truncate text-white/90 font-medium">
                    {dep.destination}
                  </span>

                  {/* Platform */}
                  {dep.platform && (
                    <span className="text-xs text-white/40 shrink-0 flex items-center gap-0.5">
                      <Clock size={10} strokeWidth={1.5} />
                      {dep.platform}
                    </span>
                  )}

                  {/* Delay or Cancelled */}
                  {dep.cancelled ? (
                    <Ban size={14} className="text-red-400 shrink-0" strokeWidth={1.5} />
                  ) : (
                    <DelayBadge delay={dep.delay} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
