import { useState, useEffect, useRef } from 'react';
import { X, Settings, Check, Loader } from 'lucide-react';
import { AppConfig, SavedSettings } from '../types';

interface Props {
  open: boolean;
  initialWidget: string;
  config: AppConfig;
  onClose: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Small form helpers ────────────────────────────────────────────────────────

function Field({
  label, hint, children,
}: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-white/25">{hint}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="bg-white/[0.07] border border-white/[0.12] rounded-lg px-3 py-3 text-base text-white/90 placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors w-full"
      style={{ fontSize: '16px', ...props.style }}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={3}
      className="bg-white/[0.07] border border-white/[0.12] rounded-lg px-3 py-3 text-base text-white/90 placeholder-white/25 focus:outline-none focus:border-white/30 transition-colors w-full resize-none font-mono"
      style={{ fontSize: '16px', ...props.style }}
    />
  );
}

function ScaleSlider({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <Field label={label ?? 'Scale'} hint={`${pct}% — drag to resize widget content`}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={50}
          max={200}
          step={5}
          value={pct}
          onChange={e => onChange(parseInt(e.target.value, 10) / 100)}
          className="flex-1 accent-white/60 h-2 cursor-pointer"
          style={{ touchAction: 'none', minHeight: '44px' }}
        />
        <span className="text-sm font-mono text-white/60 w-12 text-right tabular-nums shrink-0">
          {pct}%
        </span>
      </div>
    </Field>
  );
}

function Section({ id, title, icon, children }: {
  id: string; title: string; icon: string; children: React.ReactNode;
}) {
  return (
    <div id={`settings-${id}`} className="space-y-3">
      <div className="flex items-center gap-2 pb-1 border-b border-white/[0.07]">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold text-white/70">{title}</h3>
      </div>
      <div className="space-y-4 pl-1">
        {children}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SettingsPanel({ open, initialWidget, config, onClose }: Props) {
  const [form, setForm] = useState<SavedSettings>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Populate form from current config whenever panel opens
  useEffect(() => {
    if (open) {
      setForm({
        timezone:                  config.timezone,
        weatherLat:                config.weatherLat,
        weatherLon:                config.weatherLon,
        stationName:               config.stationName,
        commuteToStation:          config.commuteToStation,
        calendarIcalUrl:           config.calendarIcalUrl,
        calendarDisplayDays:       config.calendarDisplayDays,
        holidayCountry:            config.holidayCountry,
        holidayTown1:              config.holidayTown1,
        holidayTown2:              config.holidayTown2,
        holidaysMaxItems:          config.holidaysMaxItems,
        rssFeeds:                  config.rssFeeds,
        rssItemDurationSeconds:    config.rssItemDurationSeconds,
        metarIcao:                 config.metarIcao,
        scaleClock:                config.scaleClock,
        scaleWeather:              config.scaleWeather,
        scaleTransport:            config.scaleTransport,
        scaleCalendar:             config.scaleCalendar,
        scaleHolidays:             config.scaleHolidays,
        scaleMetar:                config.scaleMetar,
        scaleNewsTicker:           config.scaleNewsTicker,
      });
      setSaveStatus('idle');
    }
  }, [open, config]);

  // Scroll to the relevant section when a specific widget triggered the open
  useEffect(() => {
    if (open && initialWidget && scrollRef.current) {
      const el = scrollRef.current.querySelector(`#settings-${initialWidget}`);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
    }
  }, [open, initialWidget]);

  function set(key: keyof SavedSettings, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaveStatus('saved');
      // Reload after short delay so user sees the checkmark
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      console.error('Failed to save settings', err);
      setSaveStatus('error');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-40 w-[440px] flex flex-col bg-[#0d1220]/95 border-l border-white/[0.08] shadow-2xl transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/[0.07] shrink-0">
          <Settings size={14} className="text-white/40" strokeWidth={2} />
          <span className="text-sm font-semibold text-white/70 flex-1 uppercase tracking-widest">
            Settings
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 active:text-white transition-colors rounded-lg"
            aria-label="Close settings"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Scrollable content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-7 no-scrollbar">

          <Section id="clock" title="Clock" icon="🕐">
            <Field label="Timezone" hint="IANA timezone, e.g. Europe/Zurich">
              <Input
                value={form.timezone ?? ''}
                onChange={e => set('timezone', e.target.value)}
                placeholder="Europe/Zurich"
              />
            </Field>
            <ScaleSlider
              value={form.scaleClock ?? 1.0}
              onChange={v => set('scaleClock', v)}
            />
          </Section>

          <Section id="weather" title="Weather" icon="🌤">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude">
                <Input
                  value={form.weatherLat ?? ''}
                  onChange={e => set('weatherLat', e.target.value)}
                  placeholder="47.3769"
                />
              </Field>
              <Field label="Longitude">
                <Input
                  value={form.weatherLon ?? ''}
                  onChange={e => set('weatherLon', e.target.value)}
                  placeholder="8.5417"
                />
              </Field>
            </div>
            <ScaleSlider
              value={form.scaleWeather ?? 1.0}
              onChange={v => set('scaleWeather', v)}
            />
          </Section>

          <Section id="transport" title="Transport (SBB)" icon="🚂">
            <Field label="Departure station" hint="Exact SBB name, e.g. Zürich HB">
              <Input
                value={form.stationName ?? ''}
                onChange={e => set('stationName', e.target.value)}
                placeholder="Zürich HB"
              />
            </Field>
            <Field label="Commute destination" hint="Leave blank to hide commute section">
              <Input
                value={form.commuteToStation ?? ''}
                onChange={e => set('commuteToStation', e.target.value)}
                placeholder="e.g. Bern"
              />
            </Field>
            <ScaleSlider
              value={form.scaleTransport ?? 1.0}
              onChange={v => set('scaleTransport', v)}
            />
          </Section>

          <Section id="calendar" title="Calendar" icon="📅">
            <Field label="iCal URL" hint="Google Calendar → Settings → Secret iCal address">
              <Input
                value={form.calendarIcalUrl ?? ''}
                onChange={e => set('calendarIcalUrl', e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/..."
              />
            </Field>
            <Field label="Days to display">
              <Input
                type="number"
                min={1} max={60}
                value={form.calendarDisplayDays ?? 14}
                onChange={e => set('calendarDisplayDays', parseInt(e.target.value, 10))}
              />
            </Field>
            <ScaleSlider
              value={form.scaleCalendar ?? 1.0}
              onChange={v => set('scaleCalendar', v)}
            />
          </Section>

          <Section id="holidays" title="Public Holidays" icon="🎉">
            <Field label="Country code" hint="ISO 3166-1 alpha-2, e.g. CH, DE, FR">
              <Input
                value={form.holidayCountry ?? ''}
                onChange={e => set('holidayCountry', e.target.value.toUpperCase())}
                placeholder="CH"
                maxLength={2}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Canton / region 1" hint="e.g. ZH, BE">
                <Input
                  value={form.holidayTown1 ?? ''}
                  onChange={e => set('holidayTown1', e.target.value.toUpperCase())}
                  placeholder="ZH"
                  maxLength={4}
                />
              </Field>
              <Field label="Canton / region 2">
                <Input
                  value={form.holidayTown2 ?? ''}
                  onChange={e => set('holidayTown2', e.target.value.toUpperCase())}
                  placeholder=""
                  maxLength={4}
                />
              </Field>
            </div>
            <Field label="Max items to show">
              <Input
                type="number"
                min={1} max={30}
                value={form.holidaysMaxItems ?? 8}
                onChange={e => set('holidaysMaxItems', parseInt(e.target.value, 10))}
              />
            </Field>
            <ScaleSlider
              value={form.scaleHolidays ?? 1.0}
              onChange={v => set('scaleHolidays', v)}
            />
          </Section>

          <Section id="rss" title="News Ticker" icon="📰">
            <Field label="RSS feed URLs" hint="One URL per line">
              <Textarea
                value={(form.rssFeeds ?? '').split(',').join('\n')}
                onChange={e => set('rssFeeds', e.target.value.split('\n').map(s => s.trim()).filter(Boolean).join(','))}
                placeholder="https://feeds.bbci.co.uk/news/world/rss.xml"
              />
            </Field>
            <Field label="Seconds per headline">
              <Input
                type="number"
                min={3} max={60}
                value={form.rssItemDurationSeconds ?? 10}
                onChange={e => set('rssItemDurationSeconds', parseInt(e.target.value, 10))}
              />
            </Field>
            <ScaleSlider
              value={form.scaleNewsTicker ?? 1.25}
              onChange={v => set('scaleNewsTicker', v)}
            />
          </Section>

          <Section id="metar" title="METAR" icon="✈️">
            <Field label="Airport ICAO code" hint="4-letter ICAO code, e.g. LSZH, EGLL, KJFK">
              <Input
                value={form.metarIcao ?? ''}
                onChange={e => set('metarIcao', e.target.value.toUpperCase())}
                placeholder="LSZH"
                maxLength={4}
              />
            </Field>
            <ScaleSlider
              value={form.scaleMetar ?? 1.0}
              onChange={v => set('scaleMetar', v)}
            />
          </Section>

        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.07] shrink-0">
          {saveStatus === 'error' && (
            <p className="text-xs text-red-400 mb-2">Failed to save — check backend logs.</p>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'saving' || saveStatus === 'saved'}
            className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 active:bg-white/20 disabled:opacity-50 text-white/80 text-sm font-medium py-3.5 rounded-xl transition-colors"
            style={{ minHeight: '52px' }}
          >
            {saveStatus === 'saving' && <Loader size={16} className="animate-spin" />}
            {saveStatus === 'saved'  && <Check  size={16} className="text-green-400" />}
            {saveStatus === 'saving' ? 'Saving…'
              : saveStatus === 'saved' ? 'Saved — reloading'
              : 'Save & Reload'}
          </button>
          <p className="text-[11px] text-white/20 text-center mt-2">
            Settings are stored on the server and persist across restarts.
          </p>
        </div>
      </div>
    </>
  );
}
