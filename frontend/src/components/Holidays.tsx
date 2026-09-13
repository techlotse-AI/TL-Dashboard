import { PartyPopper, Settings } from 'lucide-react';
import { format, parseISO, differenceInDays, isToday } from 'date-fns';
import { FetchState, HolidayData, PublicHoliday } from '../types';

interface Props {
  state: FetchState<HolidayData>;
  town1?: string;
  town2?: string;
  maxItems?: number;
  scale?: number;
  onSettingsOpen?: () => void;
}

function daysUntil(dateStr: string): number {
  try {
    return differenceInDays(parseISO(dateStr), new Date());
  } catch {
    return 999;
  }
}

function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), 'd MMM'); }
  catch { return dateStr; }
}

function HolidayRow({ holiday }: { holiday: PublicHoliday }) {
  const days = daysUntil(holiday.date);
  const today = isToday(parseISO(holiday.date));

  const towns = holiday.relevantTowns;
  const scope = holiday.isNational
    ? 'CH'
    : towns.length > 0
    ? towns.join(', ')
    : (holiday.counties ?? []).map(c => c.replace('CH-', '')).join(', ');

  return (
    <div className={`flex items-center gap-3 py-1.5 ${today ? 'text-yellow-300' : ''}`}>
      <div className="w-10 shrink-0 text-right">
        <span className="text-xs font-mono text-white/40">{formatDate(holiday.date)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white/90 truncate">{holiday.localName}</div>
        {holiday.localName !== holiday.name && (
          <div className="text-xs text-white/30 truncate">{holiday.name}</div>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {scope && (
          <span className="text-[10px] text-white/30 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">
            {scope}
          </span>
        )}
        <span className={`text-xs tabular-nums ${today ? 'text-yellow-300 font-semibold' : days <= 7 ? 'text-orange-300' : 'text-white/30'}`}>
          {today ? 'Today' : `${days}d`}
        </span>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-8 bg-white/10 rounded" />)}
    </div>
  );
}

export default function Holidays({ state, town1, town2, maxItems = 8, scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 h-full flex flex-col gap-3" style={{ zoom: scale }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
        <PartyPopper size={12} strokeWidth={2} />
        Public Holidays
        {onSettingsOpen && (
          <button onClick={onSettingsOpen} className="ml-auto text-white/20 hover:text-white/60 transition-colors" aria-label="Holidays settings">
            <Settings size={11} strokeWidth={2} />
          </button>
        )}
      </h2>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <div className="text-red-400/80 text-sm">
          <p className="font-medium">Holidays unavailable</p>
          <p className="text-xs opacity-70 mt-1 font-mono">{state.error}</p>
        </div>
      ) : state.data.holidays.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-4">No upcoming holidays</div>
      ) : (
        <div className="flex flex-col divide-y divide-white/[0.05] overflow-y-auto no-scrollbar">
          {state.data.holidays.slice(0, maxItems).map((h) => (
            <HolidayRow key={`${h.date}-${h.name}`} holiday={h} />
          ))}
        </div>
      )}
    </div>
  );
}
