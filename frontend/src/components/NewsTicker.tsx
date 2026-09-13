import { useState, useEffect, useRef } from 'react';
import { Rss, Settings } from 'lucide-react';
import { FetchState, RssData } from '../types';

interface Props {
  state: FetchState<RssData>;
  /** How long each headline is shown, in milliseconds. Default: 10 000 (10 s) */
  itemDurationMs?: number;
  /** Content scale factor. Default: 1.25 */
  scale?: number;
  onSettingsOpen?: () => void;
}

const FADE_MS = 400; // crossfade duration

export default function NewsTicker({ state, itemDurationMs = 10_000, scale = 1.25, onSettingsOpen }: Props) {
  const items =
    state.status === 'success'
      ? state.data.items.filter((i) => i.title.length > 0)
      : [];

  const [index, setIndex]     = useState(0);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Advance to the next item: fade out → swap → fade in
  useEffect(() => {
    if (items.length <= 1) return;

    timerRef.current = setTimeout(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % items.length);
        setVisible(true);
      }, FADE_MS);
    }, itemDurationMs);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  // Re-run whenever the current index or item list changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, itemDurationMs]);

  // Reset index when items list refreshes (new fetch)
  useEffect(() => {
    setIndex(0);
    setVisible(true);
  }, [items.length]);

  const current = items[index] ?? null;

  // Progress bar: shrinks from 100% → 0% over itemDurationMs, resets on each item
  const [progress, setProgress] = useState(100);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setProgress(100);
    if (progressRef.current) clearInterval(progressRef.current);
    if (items.length <= 1) return;

    const steps = 100;
    const stepMs = itemDurationMs / steps;
    progressRef.current = setInterval(() => {
      setProgress((p) => Math.max(0, p - 1));
    }, stepMs);

    return () => { if (progressRef.current) clearInterval(progressRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, items.length, itemDurationMs]);

  return (
    <div className="panel-tight px-3 py-0 flex flex-col overflow-hidden" style={{ zoom: scale }}>
      {/* Main row */}
      <div className="flex items-center gap-3 py-2">
        {/* Static label */}
        <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/40">
          <Rss size={11} strokeWidth={2} />
          News
          {onSettingsOpen && (
            <button onClick={onSettingsOpen} className="text-white/20 hover:text-white/60 transition-colors ml-0.5" aria-label="News settings">
              <Settings size={11} strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="w-px h-4 bg-white/10 shrink-0" />

        {/* Headline */}
        <div className="flex-1 min-w-0 relative h-5 flex items-center">
          {state.status === 'loading' || state.status === 'idle' ? (
            <div className="h-4 w-64 bg-white/10 rounded animate-pulse" />
          ) : state.status === 'error' ? (
            <span className="text-xs text-red-400/70">News feed unavailable</span>
          ) : !current ? (
            <span className="text-xs text-white/30">No news items</span>
          ) : (
            <span
              className="text-sm truncate transition-opacity"
              style={{
                opacity: visible ? 1 : 0,
                transitionDuration: `${FADE_MS}ms`,
              }}
            >
              <span className="text-white/90 font-medium">{current.title}</span>
              <span className="text-white/35 text-xs ml-2">— {current.source}</span>
            </span>
          )}
        </div>

        {/* Item counter */}
        {items.length > 1 && (
          <span className="shrink-0 text-[10px] text-white/25 tabular-nums font-mono">
            {index + 1}/{items.length}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {items.length > 1 && (
        <div className="h-px bg-white/[0.06] mx-0">
          <div
            className="h-full bg-white/20 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
