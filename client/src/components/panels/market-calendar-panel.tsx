import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useEarningsCalendar, type EarningsEntry } from '../../api/hooks/use-earnings';
import { useDividends, type DividendStock } from '../../api/hooks/use-dividends';
import { useIPO, type IPOEntry } from '../../api/hooks/use-ipo';
import { useEconomicCalendar, type EconomicEvent } from '../../api/hooks/use-calendar';
import { useAppStore } from '../../stores/use-app-store';
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List, RefreshCw, TrendingUp, Globe, DollarSign, Rocket } from 'lucide-react';
import { useT } from '../../i18n';
import { useQueryClient } from '@tanstack/react-query';

// Unified calendar event
interface CalendarEvent {
  date: string; // YYYY-MM-DD
  time: string | null;
  type: 'earnings' | 'economic' | 'dividend' | 'ipo';
  title: string;
  symbol: string | null;
  details: string | null;
  importance: 'high' | 'medium' | 'low';
}

type EventType = CalendarEvent['type'];
type ViewMode = 'grid' | 'list';

const TYPE_COLORS: Record<EventType, { bg: string; text: string; border: string; dot: string }> = {
  earnings: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  economic: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-400' },
  dividend: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  ipo: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-400' },
};

const TYPE_ICONS: Record<EventType, typeof TrendingUp> = {
  earnings: TrendingUp,
  economic: Globe,
  dividend: DollarSign,
  ipo: Rocket,
};

function getWeekRange(offset: number): { start: Date; end: Date; label: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return { start: monday, end: sunday, label: `${fmt(monday)} - ${fmt(sunday)}` };
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDateStr(s: string): Date {
  // Handle both "YYYY-MM-DD" and ISO timestamps
  const d = new Date(s);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

function isToday(dateStr: string): boolean {
  return toDateKey(new Date()) === dateStr;
}

function getDayLabel(dateStr: string): string {
  const d = parseDateStr(dateStr);
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// Normalize data from different hooks into CalendarEvent[]
function normalizeEarnings(data: EarningsEntry[] | undefined): CalendarEvent[] {
  if (!data?.length) return [];
  return data
    .filter((e) => e.earningsDate)
    .map((e) => ({
      date: e.earningsDate!.slice(0, 10),
      time: null,
      type: 'earnings' as const,
      title: e.name || e.symbol,
      symbol: e.symbol,
      details: e.epsEstimate != null ? `EPS Est: $${e.epsEstimate.toFixed(2)}` : null,
      importance: 'high' as const,
    }));
}

function normalizeEconomic(data: EconomicEvent[] | undefined): CalendarEvent[] {
  if (!data?.length) return [];
  return data.map((e) => {
    const d = parseDateStr(e.date);
    const time = d.getHours() > 0 || d.getMinutes() > 0
      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : null;
    return {
      date: toDateKey(d),
      time,
      type: 'economic' as const,
      title: e.event,
      symbol: null,
      details: e.country + (e.estimate ? ` | Est: ${e.estimate}` : ''),
      importance: e.impact === 'high' ? 'high' as const : e.impact === 'medium' ? 'medium' as const : 'low' as const,
    };
  });
}

function normalizeDividends(data: DividendStock[] | undefined): CalendarEvent[] {
  if (!data?.length) return [];
  return data
    .filter((d) => d.exDividendDate)
    .map((d) => ({
      date: d.exDividendDate!.slice(0, 10),
      time: null,
      type: 'dividend' as const,
      title: d.name || d.symbol,
      symbol: d.symbol,
      details: d.dividendYield != null ? `Yield: ${d.dividendYield.toFixed(2)}%` : null,
      importance: (d.dividendYield != null && d.dividendYield >= 4 ? 'high' : 'medium') as 'high' | 'medium',
    }));
}

function normalizeIPO(data: IPOEntry[] | undefined): CalendarEvent[] {
  if (!data?.length) return [];
  return data.map((e) => ({
    date: e.ipoDate.slice(0, 10),
    time: null,
    type: 'ipo' as const,
    title: e.name || e.symbol,
    symbol: e.symbol,
    details: e.ipoPrice != null ? `Price: $${e.ipoPrice}` : e.exchange,
    importance: 'medium' as const,
  }));
}

export function MarketCalendarPanel() {
  const t = useT();
  const queryClient = useQueryClient();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTypes, setActiveTypes] = useState<Set<EventType>>(
    new Set(['earnings', 'economic', 'dividend', 'ipo']),
  );

  const { start, end, label: weekLabel } = useMemo(() => getWeekRange(weekOffset), [weekOffset]);
  const fromStr = toDateKey(start);
  const toStr = toDateKey(end);

  // Fetch data from existing hooks
  const earnings = useEarningsCalendar(30);
  const dividends = useDividends();
  const ipo = useIPO();
  const economic = useEconomicCalendar(fromStr, toStr);

  const isLoading = earnings.isLoading || dividends.isLoading || ipo.isLoading || economic.isLoading;

  // Combine and filter events for the week
  const allEvents = useMemo(() => {
    const events: CalendarEvent[] = [
      ...normalizeEarnings(earnings.data),
      ...normalizeEconomic(economic.data),
      ...normalizeDividends(dividends.data),
      ...normalizeIPO(ipo.data),
    ];
    // Filter to current week and active types
    return events.filter(
      (e) => e.date >= fromStr && e.date <= toStr && activeTypes.has(e.type),
    );
  }, [earnings.data, economic.data, dividends.data, ipo.data, fromStr, toStr, activeTypes]);

  // Group by date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of allEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    // Sort events within each day
    for (const events of map.values()) {
      events.sort((a, b) => {
        if (a.time && b.time) return a.time.localeCompare(b.time);
        if (a.time) return -1;
        if (b.time) return 1;
        return a.type.localeCompare(b.type);
      });
    }
    return map;
  }, [allEvents]);

  // Count per type
  const typeCounts = useMemo(() => {
    const counts: Record<EventType, number> = { earnings: 0, economic: 0, dividend: 0, ipo: 0 };
    for (const ev of allEvents) counts[ev.type]++;
    return counts;
  }, [allEvents]);

  // 7-day columns for grid view
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const d = new Date(start);
    for (let i = 0; i < 7; i++) {
      days.push(toDateKey(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  }, [start]);

  // Sorted unique dates for list view
  const sortedDates = useMemo(() => {
    return Array.from(eventsByDate.keys()).sort();
  }, [eventsByDate]);

  const toggleType = useCallback((type: EventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['earnings'] });
    queryClient.invalidateQueries({ queryKey: ['dividends'] });
    queryClient.invalidateQueries({ queryKey: ['ipo'] });
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
  }, [queryClient]);

  const handleEventClick = useCallback(
    (ev: CalendarEvent) => {
      if (ev.symbol) setSelectedSymbol(ev.symbol);
    },
    [setSelectedSymbol],
  );

  const typeKeys: Record<EventType, string> = {
    earnings: 'mcEarnings',
    economic: 'mcEconomic',
    dividend: 'mcDividends',
    ipo: 'mcIPO',
  };

  return (
    <GlassCard
      title={
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 text-amber-400" />
          {t('panelMarketCalendar')}
        </span>
      }
      headerRight={
        <button
          onClick={handleRefresh}
          className="text-neutral/50 hover:text-white transition-colors p-0.5"
          title={t('refresh')}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      }
      className="h-full"
    >
      {/* Controls bar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-black/20 flex-wrap">
        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((p) => p - 1)}
            className="text-neutral/50 hover:text-white transition-colors p-0.5"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className={`px-1.5 py-0.5 text-[8px] font-mono font-black uppercase transition-all ${
              weekOffset === 0
                ? 'bg-accent/20 text-accent'
                : 'text-neutral/50 hover:text-white'
            }`}
          >
            {t('mcToday')}
          </button>
          <button
            onClick={() => setWeekOffset((p) => p + 1)}
            className="text-neutral/50 hover:text-white transition-colors p-0.5"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
          <span className="text-[8px] font-mono text-neutral/40 ml-1">{weekLabel}</span>
        </div>

        <div className="w-px h-3 bg-border/30" />

        {/* Type filters */}
        <div className="flex items-center gap-0.5">
          {(['earnings', 'economic', 'dividend', 'ipo'] as const).map((type) => {
            const active = activeTypes.has(type);
            const colors = TYPE_COLORS[type];
            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={`flex items-center gap-1 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase transition-all border ${
                  active
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : 'text-neutral/30 border-transparent hover:text-neutral/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${active ? colors.dot : 'bg-neutral/20'}`} />
                {t(typeKeys[type] as 'mcEarnings' | 'mcEconomic' | 'mcDividends' | 'mcIPO')}
                <span className="text-[7px] opacity-60">{typeCounts[type]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-0.5 transition-colors ${
              viewMode === 'grid' ? 'text-accent' : 'text-neutral/40 hover:text-white'
            }`}
            title={t('mcGrid')}
          >
            <LayoutGrid className="w-3 h-3" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-0.5 transition-colors ${
              viewMode === 'list' ? 'text-accent' : 'text-neutral/40 hover:text-white'
            }`}
            title={t('mcList')}
          >
            <List className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              {t('loading')}
            </span>
          </div>
        )}

        {!isLoading && allEvents.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            {t('mcNoEvents')}
          </div>
        )}

        {!isLoading && allEvents.length > 0 && viewMode === 'grid' && (
          <GridView
            weekDays={weekDays}
            eventsByDate={eventsByDate}
            onEventClick={handleEventClick}
            t={t}
          />
        )}

        {!isLoading && allEvents.length > 0 && viewMode === 'list' && (
          <ListView
            sortedDates={sortedDates}
            eventsByDate={eventsByDate}
            onEventClick={handleEventClick}
            t={t}
          />
        )}
      </div>
    </GlassCard>
  );
}

// Grid View Component
function GridView({
  weekDays,
  eventsByDate,
  onEventClick,
  t,
}: {
  weekDays: string[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
  t: (key: 'mcToday' | 'mcEarnings' | 'mcEconomic' | 'mcDividends' | 'mcIPO' | 'mcNoEvents' | 'mcGrid' | 'mcList' | 'mcThisWeek' | 'loading' | 'panelMarketCalendar' | 'refresh') => string;
}) {
  return (
    <div className="grid grid-cols-7 h-full min-h-0">
      {weekDays.map((dateStr) => {
        const today = isToday(dateStr);
        const events = eventsByDate.get(dateStr) || [];
        const d = parseDateStr(dateStr);
        const dayName = d.toLocaleDateString(undefined, { weekday: 'short' });
        const dayNum = d.getDate();

        return (
          <div
            key={dateStr}
            className={`border-r border-border/20 last:border-r-0 flex flex-col min-h-0 ${
              today ? 'bg-accent/[0.03]' : ''
            }`}
          >
            {/* Day header */}
            <div
              className={`shrink-0 px-1 py-1 text-center border-b border-border/20 ${
                today ? 'bg-accent/10' : 'bg-black/30'
              }`}
            >
              <div className={`text-[8px] font-mono uppercase ${today ? 'text-accent' : 'text-neutral/40'}`}>
                {dayName}
              </div>
              <div
                className={`text-[11px] font-mono font-black ${
                  today ? 'text-accent' : 'text-neutral/60'
                }`}
              >
                {dayNum}
                {today && (
                  <span className="ml-1 text-[7px] font-normal px-1 py-0.5 bg-accent/20 text-accent border border-accent/30">
                    {t('mcToday')}
                  </span>
                )}
              </div>
            </div>

            {/* Events */}
            <div className="flex-1 overflow-auto no-scrollbar p-0.5 space-y-0.5">
              {events.map((ev, i) => (
                <EventPill key={`${ev.type}-${ev.symbol || ev.title}-${i}`} event={ev} onClick={onEventClick} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// List View Component
function ListView({
  sortedDates,
  eventsByDate,
  onEventClick,
  t,
}: {
  sortedDates: string[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
  t: (key: 'mcToday') => string;
}) {
  return (
    <div>
      {sortedDates.map((dateStr) => {
        const events = eventsByDate.get(dateStr) || [];
        const today = isToday(dateStr);

        return (
          <div key={dateStr}>
            {/* Date header */}
            <div
              className={`sticky top-0 z-10 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest border-b border-border/20 ${
                today ? 'bg-accent/10 text-accent border-accent/30' : 'bg-black/40 text-neutral/60'
              }`}
            >
              {getDayLabel(dateStr)}
              {today && (
                <span className="ml-2 px-1 py-0.5 text-[7px] bg-accent/20 text-accent border border-accent/30">
                  {t('mcToday')}
                </span>
              )}
              <span className="ml-2 text-[7px] font-normal text-neutral/30">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Event rows */}
            {events.map((ev, i) => (
              <EventRow key={`${ev.type}-${ev.symbol || ev.title}-${i}`} event={ev} onClick={onEventClick} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// Grid event pill
function EventPill({ event, onClick }: { event: CalendarEvent; onClick: (ev: CalendarEvent) => void }) {
  const colors = TYPE_COLORS[event.type];
  const Icon = TYPE_ICONS[event.type];
  const clickable = !!event.symbol;

  return (
    <button
      onClick={() => onClick(event)}
      disabled={!clickable}
      className={`w-full text-left px-1 py-0.5 border relative ${colors.border} ${colors.bg} transition-all ${
        clickable ? 'hover:brightness-125 cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-center gap-0.5">
        <Icon className={`w-2 h-2 shrink-0 ${colors.text}`} />
        {event.symbol && (
          <span className={`text-[8px] font-mono font-black ${colors.text} truncate`}>
            {event.symbol}
          </span>
        )}
        {event.time && (
          <span className="text-[7px] font-mono text-neutral/40 ml-auto shrink-0">{event.time}</span>
        )}
      </div>
      <div className="text-[7px] font-mono text-neutral/50 truncate leading-tight">
        {event.symbol ? event.title : event.title.slice(0, 30)}
      </div>
      {event.importance === 'high' && (
        <div className="w-1 h-1 rounded-full bg-red-400/60 absolute top-0.5 right-0.5" />
      )}
    </button>
  );
}

// List event row
function EventRow({ event, onClick }: { event: CalendarEvent; onClick: (ev: CalendarEvent) => void }) {
  const colors = TYPE_COLORS[event.type];
  const Icon = TYPE_ICONS[event.type];
  const clickable = !!event.symbol;

  return (
    <button
      onClick={() => onClick(event)}
      disabled={!clickable}
      className={`w-full grid grid-cols-[40px_50px_1fr_1fr] text-[10px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-accent/[0.04] transition-colors text-left ${
        clickable ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      {/* Time */}
      <span className="text-neutral/40 text-[9px]">{event.time || '--:--'}</span>

      {/* Type badge */}
      <span className={`flex items-center gap-0.5 ${colors.text}`}>
        <Icon className="w-2.5 h-2.5" />
        <span className={`w-1.5 h-1.5 rounded-full ${event.importance === 'high' ? 'bg-red-400' : event.importance === 'medium' ? 'bg-yellow-400/60' : 'bg-neutral/20'}`} />
      </span>

      {/* Symbol / Title */}
      <span className="truncate">
        {event.symbol && <span className={`font-black ${colors.text} mr-1`}>{event.symbol}</span>}
        <span className="text-gray-400">{event.title}</span>
      </span>

      {/* Details */}
      <span className="text-neutral/40 truncate text-right">{event.details || ''}</span>
    </button>
  );
}
