import { useState, useEffect } from 'react';
import { format, toZonedTime } from 'date-fns-tz';
import { Settings } from 'lucide-react';
import { AppConfig } from '../types';

interface Props {
  config: AppConfig;
  scale?: number;
  onSettingsOpen?: () => void;
}

export default function Clock({ config, scale = 1, onSettingsOpen }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const tz = config.timezone || 'Europe/Zurich';
  const zoned = toZonedTime(now, tz);

  const timeStr = format(zoned, 'HH:mm', { timeZone: tz });
  const secsStr = format(zoned, 'ss', { timeZone: tz });
  const dateStr = format(zoned, 'EEEE, d MMMM yyyy', { timeZone: tz });

  return (
    // @container: in a wide cell (the portrait header row) the time steps up to fill it.
    <div className="clock-align flex flex-col select-none w-full @container" style={{ zoom: scale }}>
      {/* Time */}
      <div className="flex items-baseline gap-1">
        <span className="text-7xl @xs:text-8xl font-light tabular-nums tracking-tight leading-none text-white">
          {timeStr}
        </span>
        <span className="text-3xl @xs:text-4xl font-light tabular-nums text-white/40 w-[2.4rem] @xs:w-[3rem]">
          {secsStr}
        </span>
      </div>
      {/* Date + settings gear */}
      <div className="flex items-center gap-2 mt-1">
        <div className="text-lg @xs:text-xl font-normal text-white/60 tracking-wide">
          {dateStr}
        </div>
        {onSettingsOpen && (
          <button
            onClick={onSettingsOpen}
            className="text-white/20 hover:text-white/60 transition-colors"
            aria-label="Clock settings"
          >
            <Settings size={12} strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
