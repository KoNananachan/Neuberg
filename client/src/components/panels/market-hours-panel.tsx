import { useState, useEffect, useMemo, useCallback } from 'react';
import { Globe } from 'lucide-react';
import { GlassCard } from '../common/glass-card';
import { useT, type TranslationKey } from '../../i18n';

// --- Market data ---

interface MarketDef {
  name: string;
  code: string;
  region: 'americas' | 'europe' | 'asia' | 'middle_east';
  tz: string;
  open: string;   // HH:MM local
  close: string;
  preOpen?: string;
  postClose?: string;
  lunchStart?: string;
  lunchEnd?: string;
}

const MARKETS: MarketDef[] = [
  // Americas
  { name: 'New York (NYSE/NASDAQ)', code: 'US', region: 'americas', tz: 'America/New_York', open: '09:30', close: '16:00', preOpen: '04:00', postClose: '20:00' },
  { name: 'Toronto (TSX)', code: 'CA', region: 'americas', tz: 'America/Toronto', open: '09:30', close: '16:00' },
  { name: 'São Paulo (B3)', code: 'BR', region: 'americas', tz: 'America/Sao_Paulo', open: '10:00', close: '17:00' },
  { name: 'Mexico (BMV)', code: 'MX', region: 'americas', tz: 'America/Mexico_City', open: '08:30', close: '15:00' },
  // Europe
  { name: 'London (LSE)', code: 'GB', region: 'europe', tz: 'Europe/London', open: '08:00', close: '16:30' },
  { name: 'Frankfurt (XETRA)', code: 'DE', region: 'europe', tz: 'Europe/Berlin', open: '09:00', close: '17:30' },
  { name: 'Paris (Euronext)', code: 'FR', region: 'europe', tz: 'Europe/Paris', open: '09:00', close: '17:30' },
  { name: 'Zurich (SIX)', code: 'CH', region: 'europe', tz: 'Europe/Zurich', open: '09:00', close: '17:30' },
  { name: 'Amsterdam (Euronext)', code: 'NL', region: 'europe', tz: 'Europe/Amsterdam', open: '09:00', close: '17:30' },
  { name: 'Madrid (BME)', code: 'ES', region: 'europe', tz: 'Europe/Madrid', open: '09:00', close: '17:30' },
  { name: 'Milan (Borsa)', code: 'IT', region: 'europe', tz: 'Europe/Rome', open: '09:00', close: '17:30' },
  { name: 'Moscow (MOEX)', code: 'RU', region: 'europe', tz: 'Europe/Moscow', open: '10:00', close: '18:50' },
  // Asia-Pacific
  { name: 'Tokyo (TSE)', code: 'JP', region: 'asia', tz: 'Asia/Tokyo', open: '09:00', close: '15:00', lunchStart: '11:30', lunchEnd: '12:30' },
  { name: 'Shanghai (SSE)', code: 'CN', region: 'asia', tz: 'Asia/Shanghai', open: '09:30', close: '15:00', lunchStart: '11:30', lunchEnd: '13:00' },
  { name: 'Hong Kong (HKEX)', code: 'HK', region: 'asia', tz: 'Asia/Hong_Kong', open: '09:30', close: '16:00', lunchStart: '12:00', lunchEnd: '13:00' },
  { name: 'Singapore (SGX)', code: 'SG', region: 'asia', tz: 'Asia/Singapore', open: '09:00', close: '17:00' },
  { name: 'Sydney (ASX)', code: 'AU', region: 'asia', tz: 'Australia/Sydney', open: '10:00', close: '16:00' },
  { name: 'Mumbai (NSE)', code: 'IN', region: 'asia', tz: 'Asia/Kolkata', open: '09:15', close: '15:30' },
  { name: 'Seoul (KRX)', code: 'KR', region: 'asia', tz: 'Asia/Seoul', open: '09:00', close: '15:30' },
  { name: 'Taipei (TWSE)', code: 'TW', region: 'asia', tz: 'Asia/Taipei', open: '09:00', close: '13:30' },
  // Middle East
  { name: 'Dubai (DFM)', code: 'AE', region: 'middle_east', tz: 'Asia/Dubai', open: '10:00', close: '14:00' },
  { name: 'Tel Aviv (TASE)', code: 'IL', region: 'middle_east', tz: 'Asia/Jerusalem', open: '09:59', close: '17:15' },
];

type RegionFilter = 'all' | 'americas' | 'europe' | 'asia' | 'middle_east';
type MarketStatus = 'open' | 'closed' | 'pre_market' | 'post_market' | 'lunch' | 'weekend';

const REGION_LABELS: Record<RegionFilter, TranslationKey | 'all'> = {
  all: 'all',
  americas: 'mhAmericas',
  europe: 'mhEurope',
  asia: 'mhAsia',
  middle_east: 'mhMiddleEast',
};

// --- Timezone helpers ---

/** Parse "HH:MM" into total minutes */
function parseHM(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

/** Get current minutes-since-midnight in a timezone */
function getCurrentMinutes(tz: string, now: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find(p => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find(p => p.type === 'minute')?.value ?? '0');
  // Intl may return hour=24 for midnight
  return (hour === 24 ? 0 : hour) * 60 + minute;
}

/** Get the day-of-week (0=Sun, 6=Sat) in a timezone */
function getDayOfWeek(tz: string, now: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const day = fmt.format(now);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[day] ?? 0;
}

/** Get the local time string for a market */
function getLocalTime(tz: string, now: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
}

/** Format UTC time */
function getUTCString(now: Date): string {
  return now.toISOString().slice(11, 19) + ' UTC';
}

/** Convert local market HH:MM to UTC minutes offset for the timeline */
function localMinutesToUTCMinutes(localMinutes: number, tz: string, now: Date): number {
  // Get the offset: difference between UTC and local time
  const localMins = getCurrentMinutes(tz, now);
  const utcMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const offset = localMins - utcMins; // positive if ahead of UTC
  let utc = localMinutes - offset;
  // Wrap around
  if (utc < 0) utc += 1440;
  if (utc >= 1440) utc -= 1440;
  return utc;
}

function getMarketStatus(market: MarketDef, now: Date): MarketStatus {
  const dow = getDayOfWeek(market.tz, now);
  if (dow === 0 || dow === 6) return 'weekend';

  const current = getCurrentMinutes(market.tz, now);
  const openMin = parseHM(market.open);
  const closeMin = parseHM(market.close);

  // Lunch break check
  if (market.lunchStart && market.lunchEnd) {
    const lunchS = parseHM(market.lunchStart);
    const lunchE = parseHM(market.lunchEnd);
    if (current >= lunchS && current < lunchE) return 'lunch';
  }

  // Regular hours
  if (current >= openMin && current < closeMin) return 'open';

  // Pre-market
  if (market.preOpen) {
    const preMin = parseHM(market.preOpen);
    if (current >= preMin && current < openMin) return 'pre_market';
  }

  // Post-market
  if (market.postClose) {
    const postMin = parseHM(market.postClose);
    if (current >= closeMin && current < postMin) return 'post_market';
  }

  return 'closed';
}

/** Get time until next open or close */
function getTimeUntil(market: MarketDef, status: MarketStatus, now: Date): string {
  const current = getCurrentMinutes(market.tz, now);

  let targetMin: number;
  if (status === 'open' || status === 'lunch') {
    targetMin = parseHM(market.close);
  } else if (status === 'pre_market') {
    targetMin = parseHM(market.open);
  } else {
    // closed or weekend - time until open
    targetMin = parseHM(market.open);
  }

  let diff = targetMin - current;
  if (diff <= 0) diff += 1440;

  // For weekend, calculate days until Monday + hours
  if (status === 'weekend') {
    const dow = getDayOfWeek(market.tz, now);
    const daysUntilMonday = dow === 6 ? 2 : 1; // Sat=2 days, Sun=1 day
    const totalMin = (daysUntilMonday - 1) * 1440 + diff;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// --- Status badge colors ---

const STATUS_COLORS: Record<MarketStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
  closed: { bg: 'bg-red-500/20', text: 'text-red-400' },
  pre_market: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  post_market: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  lunch: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  weekend: { bg: 'bg-red-500/20', text: 'text-red-400' },
};

const STATUS_KEYS: Record<MarketStatus, TranslationKey> = {
  open: 'mhOpen',
  closed: 'mhClosed',
  pre_market: 'mhPreMarket',
  post_market: 'mhPostMarket',
  lunch: 'mhLunch',
  weekend: 'mhWeekend',
};

// --- SVG Timeline bar ---

const BAR_HEIGHT = 14;
const LABEL_AREA_W = 0; // We handle labels separately
const TOTAL_MINUTES = 1440;

interface TimelineBarProps {
  market: MarketDef;
  now: Date;
  barWidth: number;
}

function TimelineBar({ market, now, barWidth }: TimelineBarProps) {
  const openUTC = localMinutesToUTCMinutes(parseHM(market.open), market.tz, now);
  const closeUTC = localMinutesToUTCMinutes(parseHM(market.close), market.tz, now);
  const currentUTC = now.getUTCHours() * 60 + now.getUTCMinutes();

  const toX = (min: number) => (min / TOTAL_MINUTES) * barWidth;

  // Draw segments
  const segments: Array<{ x: number; w: number; color: string }> = [];

  // Regular trading hours (green)
  if (closeUTC > openUTC) {
    segments.push({ x: toX(openUTC), w: toX(closeUTC) - toX(openUTC), color: '#22c55e' });
  } else {
    // Wraps midnight
    segments.push({ x: toX(openUTC), w: barWidth - toX(openUTC), color: '#22c55e' });
    segments.push({ x: 0, w: toX(closeUTC), color: '#22c55e' });
  }

  // Pre-market (yellow)
  if (market.preOpen) {
    const preUTC = localMinutesToUTCMinutes(parseHM(market.preOpen), market.tz, now);
    if (openUTC > preUTC) {
      segments.push({ x: toX(preUTC), w: toX(openUTC) - toX(preUTC), color: '#eab308' });
    } else {
      segments.push({ x: toX(preUTC), w: barWidth - toX(preUTC), color: '#eab308' });
      segments.push({ x: 0, w: toX(openUTC), color: '#eab308' });
    }
  }

  // Post-market (yellow)
  if (market.postClose) {
    const postUTC = localMinutesToUTCMinutes(parseHM(market.postClose), market.tz, now);
    if (postUTC > closeUTC) {
      segments.push({ x: toX(closeUTC), w: toX(postUTC) - toX(closeUTC), color: '#eab308' });
    } else {
      segments.push({ x: toX(closeUTC), w: barWidth - toX(closeUTC), color: '#eab308' });
      segments.push({ x: 0, w: toX(postUTC), color: '#eab308' });
    }
  }

  // Lunch break overlay (red line)
  let lunchSegments: Array<{ x: number; w: number }> = [];
  if (market.lunchStart && market.lunchEnd) {
    const lsUTC = localMinutesToUTCMinutes(parseHM(market.lunchStart), market.tz, now);
    const leUTC = localMinutesToUTCMinutes(parseHM(market.lunchEnd), market.tz, now);
    if (leUTC > lsUTC) {
      lunchSegments = [{ x: toX(lsUTC), w: toX(leUTC) - toX(lsUTC) }];
    } else {
      lunchSegments = [
        { x: toX(lsUTC), w: barWidth - toX(lsUTC) },
        { x: 0, w: toX(leUTC) },
      ];
    }
  }

  const nowX = toX(currentUTC);

  return (
    <svg width={barWidth} height={BAR_HEIGHT} className="shrink-0">
      {/* Background - closed */}
      <rect x={0} y={0} width={barWidth} height={BAR_HEIGHT} rx={2} fill="#1a1a2e" />
      {/* Trading segments */}
      {segments.map((seg, i) => (
        <rect key={i} x={seg.x} y={0} width={Math.max(seg.w, 0.5)} height={BAR_HEIGHT} fill={seg.color} opacity={0.6} rx={0} />
      ))}
      {/* Lunch break (hatched overlay) */}
      {lunchSegments.map((seg, i) => (
        <rect key={`lunch-${i}`} x={seg.x} y={0} width={Math.max(seg.w, 0.5)} height={BAR_HEIGHT} fill="#f97316" opacity={0.5} />
      ))}
      {/* Current time line */}
      <line x1={nowX} y1={0} x2={nowX} y2={BAR_HEIGHT} stroke="white" strokeWidth={1.5} opacity={0.9} />
    </svg>
  );
}

// --- Hour labels row ---

function HourLabels({ barWidth }: { barWidth: number }) {
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  return (
    <svg width={barWidth} height={14} className="shrink-0">
      {hours.map(h => {
        const x = (h * 60 / TOTAL_MINUTES) * barWidth;
        return (
          <text
            key={h}
            x={x}
            y={10}
            fontSize={9}
            fill="#64748b"
            fontFamily="monospace"
            textAnchor="middle"
          >
            {String(h).padStart(2, '0')}
          </text>
        );
      })}
    </svg>
  );
}

// --- Main Panel ---

export function MarketHoursPanel() {
  const t = useT();
  const [now, setNow] = useState(() => new Date());
  const [regionFilter, setRegionFilter] = useState<RegionFilter>('all');

  // Auto-update every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Also update every second for the clock display
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(interval);
  }, []);

  const filteredMarkets = useMemo(() => {
    if (regionFilter === 'all') return MARKETS;
    return MARKETS.filter(m => m.region === regionFilter);
  }, [regionFilter]);

  const marketStatuses = useMemo(() => {
    const map = new Map<string, MarketStatus>();
    MARKETS.forEach(m => map.set(m.code, getMarketStatus(m, now)));
    return map;
  }, [now]);

  const { openCount, closedCount, prePostCount } = useMemo(() => {
    let open = 0, closed = 0, prePost = 0;
    MARKETS.forEach(m => {
      const s = marketStatuses.get(m.code);
      if (s === 'open' || s === 'lunch') open++;
      else if (s === 'pre_market' || s === 'post_market') prePost++;
      else closed++;
    });
    return { openCount: open, closedCount: closed, prePostCount: prePost };
  }, [marketStatuses]);

  const getStatusLabel = useCallback((status: MarketStatus): string => {
    return t(STATUS_KEYS[status]);
  }, [t]);

  const getTimeLabel = useCallback((market: MarketDef, status: MarketStatus): string => {
    if (status === 'weekend') return '';
    const timeStr = getTimeUntil(market, status, now);
    if (status === 'open' || status === 'lunch') {
      return `${t('mhClosesIn')} ${timeStr}`;
    }
    return `${t('mhOpensIn')} ${timeStr}`;
  }, [t, now]);

  // Responsive bar width
  const BAR_W = 360;

  const regions: RegionFilter[] = ['all', 'americas', 'europe', 'asia', 'middle_east'];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <Globe size={13} className="text-sky-400" />
          <span>{t('panelMarketHours')}</span>
        </span>
      }
      headerRight={
        <span className="text-[10px] font-mono text-sky-400 tracking-wider">
          {getUTCString(now)}
        </span>
      }
    >
      <div className="flex flex-col h-full overflow-hidden">
        {/* Summary bar */}
        <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border text-[10px] font-mono shrink-0">
          <span className="text-emerald-400">{openCount} {t('mhOpen')}</span>
          <span className="text-neutral-500">|</span>
          <span className="text-red-400">{closedCount} {t('mhClosed')}</span>
          <span className="text-neutral-500">|</span>
          <span className="text-yellow-400">{prePostCount} Pre/Post</span>
        </div>

        {/* Region filter tabs */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border shrink-0 overflow-x-auto">
          {regions.map(r => (
            <button
              key={r}
              onClick={() => setRegionFilter(r)}
              className={`px-2 py-0.5 text-[10px] font-mono tracking-wider uppercase transition-colors rounded-sm ${
                regionFilter === r
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
              }`}
            >
              {r === 'all' ? 'ALL' : t(REGION_LABELS[r] as TranslationKey)}
            </button>
          ))}
        </div>

        {/* Market list with timeline */}
        <div className="flex-1 overflow-auto">
          <div className="min-w-[600px]">
            {/* Hour labels header */}
            <div className="flex items-center px-3 py-1 border-b border-border/50 sticky top-0 bg-bg z-10">
              <div className="w-[200px] shrink-0" />
              <div className="w-[70px] shrink-0" />
              <HourLabels barWidth={BAR_W} />
              <div className="text-[9px] font-mono text-neutral-600 ml-1 shrink-0">UTC</div>
            </div>

            {/* Market rows */}
            {filteredMarkets.map(market => {
              const status = marketStatuses.get(market.code) ?? 'closed';
              const statusColor = STATUS_COLORS[status];
              const localTime = getLocalTime(market.tz, now);
              const timeLabel = getTimeLabel(market, status);

              return (
                <div
                  key={market.code}
                  className="flex items-center px-3 py-1 border-b border-border/30 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Market info */}
                  <div className="w-[200px] shrink-0 flex flex-col mr-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold text-neutral-200 truncate">
                        {market.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-mono text-neutral-500">{localTime}</span>
                      {timeLabel && (
                        <span className="text-[9px] font-mono text-neutral-600">{timeLabel}</span>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="w-[70px] shrink-0 flex justify-center">
                    <span className={`px-1.5 py-0.5 text-[8px] font-mono font-bold tracking-wider uppercase rounded-sm ${statusColor.bg} ${statusColor.text}`}>
                      {getStatusLabel(status)}
                    </span>
                  </div>

                  {/* Timeline bar */}
                  <TimelineBar market={market} now={now} barWidth={BAR_W} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-3 py-1.5 border-t border-border text-[9px] font-mono text-neutral-500 shrink-0 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-emerald-500/60" />
            {t('mhOpen')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-yellow-500/60" />
            {t('mhPreMarket')}/{t('mhPostMarket')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-orange-500/60" />
            {t('mhLunch')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-2 rounded-sm bg-[#1a1a2e]" />
            {t('mhClosed')}
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-white" />
            Now
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
