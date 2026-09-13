import { Calendar, MapPin, Clock, Settings } from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, startOfDay, isValid } from 'date-fns';
import { FetchState, CalendarData, CalendarEvent } from '../types';

interface Props {
  state: FetchState<CalendarData>;
  displayDays?: number;
  scale?: number;
  onSettingsOpen?: () => void;
}

// Google Calendar colour IDs → Tailwind border colours
const GCal_COLORS: Record<string, string> = {
  '1': 'border-blue-400',
  '2': 'border-green-400',
  '3': 'border-purple-400',
  '4': 'border-red-400',
  '5': 'border-yellow-400',
  '6': 'border-orange-400',
  '7': 'border-teal-400',
  '8': 'border-gray-400',
  '9': 'border-indigo-400',
  '10': 'border-green-300',
  '11': 'border-red-300',
};

function safeParse(dateStr: string): Date {
  // Backend always sends full ISO strings (e.g. "2026-06-15T00:00:00.000Z").
  // For all-day events we want the local calendar date — strip the time part.
  const iso = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  return parseISO(iso);
}

function dayLabel(dateStr: string): string {
  try {
    const d = safeParse(dateStr);
    if (!isValid(d)) return dateStr;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEE d MMM');
  } catch {
    return dateStr;
  }
}

function timeRange(event: CalendarEvent): string {
  if (event.allDay) return 'All day';
  try {
    const s = format(parseISO(event.start), 'HH:mm');
    const e = format(parseISO(event.end),   'HH:mm');
    return `${s} – ${e}`;
  } catch {
    return '';
  }
}

function eventDate(event: CalendarEvent): Date {
  try {
    const d = safeParse(event.start);
    return isValid(d) ? d : new Date();
  } catch {
    return new Date();
  }
}

interface EventGroup {
  label: string;
  events: CalendarEvent[];
}

function groupByDay(events: CalendarEvent[], displayDays = 14): EventGroup[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + displayDays);
  const groups: Map<string, EventGroup> = new Map();
  for (const ev of events) {
    const d = eventDate(ev);
    if (!isValid(d)) continue;
    if (d > cutoff) continue;
    const key = format(startOfDay(d), 'yyyy-MM-dd');
    if (!groups.has(key)) {
      groups.set(key, { label: dayLabel(ev.start), events: [] });
    }
    groups.get(key)!.events.push(ev);
  }
  return Array.from(groups.values());
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2">
      {[1,2,3].map(i => <div key={i} className="h-12 bg-white/10 rounded-lg" />)}
    </div>
  );
}

export default function CalendarWidget({ state, displayDays = 14, scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 h-full flex flex-col gap-3" style={{ zoom: scale }}>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-1.5">
        <Calendar size={12} strokeWidth={2} />
        Calendar
        {onSettingsOpen && (
          <button onClick={onSettingsOpen} className="ml-auto text-white/20 hover:text-white/60 transition-colors" aria-label="Calendar settings">
            <Settings size={11} strokeWidth={2} />
          </button>
        )}
      </h2>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <div className="text-red-400/80 text-sm">
          <p className="font-medium">Calendar unavailable</p>
          <p className="text-xs opacity-70 mt-1 font-mono">{state.error}</p>
        </div>
      ) : state.data.events.length === 0 ? (
        <div className="text-white/30 text-sm text-center py-4">No upcoming events</div>
      ) : (
        <div className="flex flex-col gap-3 overflow-y-auto no-scrollbar">
          {groupByDay(state.data.events, displayDays).slice(0, displayDays).map((group) => (
            <div key={group.label}>
              <div className="text-[11px] font-semibold uppercase tracking-widest text-white/30 mb-1.5">
                {group.label}
              </div>
              <div className="flex flex-col gap-1">
                {group.events.map((ev) => {
                  const borderColor = ev.color ? GCal_COLORS[ev.color] ?? 'border-blue-400' : 'border-blue-400';
                  return (
                    <div
                      key={ev.id}
                      className={`pl-2.5 border-l-2 ${borderColor} py-0.5`}
                    >
                      <div className="text-sm text-white/90 font-medium leading-tight truncate">
                        {ev.title}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-white/40 flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                          <Clock size={10} strokeWidth={1.5} />
                          {timeRange(ev)}
                        </span>
                        {ev.location && (
                          <span className="text-xs text-white/30 flex items-center gap-0.5 min-w-0">
                            <MapPin size={10} strokeWidth={1.5} className="shrink-0" />
                            <span className="truncate">{ev.location}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
