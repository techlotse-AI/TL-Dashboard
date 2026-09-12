import { PlaneTakeoff, Settings } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { FetchState, MetarData, SkyLayer } from '../types';

interface Props {
  state: FetchState<MetarData>;
  scale?: number;
  onSettingsOpen?: () => void;
}

// Flight category → colour
const FC_COLORS: Record<string, string> = {
  VFR:  'text-green-400  bg-green-400/10  border-green-400/30',
  MVFR: 'text-blue-400   bg-blue-400/10   border-blue-400/30',
  IFR:  'text-red-400    bg-red-400/10    border-red-400/30',
  LIFR: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
  UNKN: 'text-white/40   bg-white/5       border-white/20',
};

function windStr(d: MetarData): string {
  if (d.wspd === 0 || d.wspd === null) return 'Calm';
  const dir = d.wdir !== null ? `${String(d.wdir).padStart(3, '0')}°` : 'VRB';
  const spd = `${d.wspd}KT`;
  const gust = d.wgst ? ` G${d.wgst}` : '';
  return `${dir} ${spd}${gust}`;
}

function visStr(v: string): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n >= 10) return '10+ SM';
  return `${v} SM`;
}

function skyStr(layers: SkyLayer[]): string {
  if (!layers.length) return 'CLR';
  return layers
    .map(l => l.base !== null ? `${l.cover} ${l.base.toLocaleString()}ft` : l.cover)
    .join('  ');
}

function obsTimeStr(iso: string): string {
  try { return format(parseISO(iso), 'HH:mm') + 'Z'; }
  catch { return '—'; }
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-1.5">
      {[1,2,3].map(i => <div key={i} className="h-4 bg-white/10 rounded" />)}
    </div>
  );
}

export default function MetarWidget({ state, scale = 1, onSettingsOpen }: Props) {
  return (
    <div className="panel p-4 flex flex-col gap-2.5" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%` }}>
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <PlaneTakeoff size={12} strokeWidth={2} className="text-white/40" />
        <span className="text-xs font-semibold uppercase tracking-widest text-white/40 flex-1">
          METAR
        </span>
        {onSettingsOpen && (
          <button
            onClick={onSettingsOpen}
            className="text-white/20 hover:text-white/60 transition-colors"
            aria-label="METAR settings"
          >
            <Settings size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <Skeleton />
      ) : state.status === 'error' ? (
        <div className="text-red-400/80 text-sm">
          <p className="font-medium">METAR unavailable</p>
          <p className="text-xs opacity-70 mt-0.5 font-mono">{state.error}</p>
        </div>
      ) : (() => {
        const d = state.data;
        const fcClass = FC_COLORS[d.flightCategory] ?? FC_COLORS.UNKN;
        return (
          <>
            {/* Station + category + time */}
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-white/90 tracking-wider">
                {d.icao}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${fcClass} leading-none`}>
                {d.flightCategory}
              </span>
              {d.stale && (
                <span className="text-[10px] text-yellow-400/60 font-mono leading-none" title="Showing last known data — API temporarily unavailable">
                  STALE
                </span>
              )}
              <span className="ml-auto text-xs text-white/35 font-mono tabular-nums">
                {obsTimeStr(d.obsTime)}
              </span>
            </div>

            {/* Data rows */}
            <div className="space-y-1 text-xs">
              <Row label="Wind"  value={windStr(d)} />
              <Row label="Vis"   value={visStr(d.visib)} />
              {d.wx && <Row label="WX" value={d.wx} highlight />}
              <Row label="Sky"   value={skyStr(d.skyConditions)} />
              <Row
                label="Temp"
                value={
                  d.temp !== null && d.dewp !== null
                    ? `${d.temp.toFixed(1)}° / ${d.dewp.toFixed(1)}°C`
                    : '—'
                }
              />
              {d.altim !== null && (
                <Row label="QNH" value={`${d.altim} hPa`} />
              )}
            </div>

            {/* Raw METAR */}
            <p className="text-[10px] text-white/20 font-mono leading-tight break-all mt-0.5">
              {d.rawText}
            </p>
          </>
        );
      })()}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="w-8 shrink-0 text-white/30">{label}</span>
      <span className={highlight ? 'text-yellow-300 font-medium' : 'text-white/75'}>{value}</span>
    </div>
  );
}
