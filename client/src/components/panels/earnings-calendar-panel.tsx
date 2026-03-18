import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import {
  useEarningsCalendarHeatmap,
  type EarningsEvent,
} from '../../api/hooks/use-earnings-calendar';
import { CalendarDays, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { useT } from '../../i18n';

// ── i18n helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as any)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type ViewMode = 'CALENDAR' | 'TABLE' | 'HEATMAP';
type SortKey = 'date' | 'symbol' | 'surprise' | 'expectedMove' | 'marketCap';
type SortDir = 'asc' | 'desc';

// ── Formatting helpers ──

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtRevenue(n: number | null): string {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}T`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
}

function fmtEps(n: number | null): string {
  if (n == null) return '-';
  return `$${n.toFixed(2)}`;
}

function pctColor(n: number | null): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function surpriseBg(n: number | null, reported: boolean): string {
  if (!reported || n == null) return 'bg-white/[0.03]';
  return n >= 0 ? 'bg-green-500/[0.06]' : 'bg-red-500/[0.06]';
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Inline Surprise Spark (8 quarters) ──

function SurpriseSpark({ history }: { history: number[] }) {
  if (!history || history.length === 0) return <span className="text-neutral/30">-</span>;

  const maxAbs = Math.max(...history.map(Math.abs), 1);
  const barH = 12;
  const barW = 4;
  const gap = 1;
  const w = history.length * (barW + gap);

  return (
    <svg width={w} height={barH} className="inline-block align-middle">
      {history.map((val, i) => {
        const h = (Math.abs(val) / maxAbs) * (barH / 2);
        const y = val >= 0 ? barH / 2 - h : barH / 2;
        const fill = val >= 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)';
        return (
          <rect
            key={i}
            x={i * (barW + gap)}
            y={y}
            width={barW}
            height={Math.max(h, 0.5)}
            fill={fill}
          />
        );
      })}
      <line
        x1={0} x2={w}
        y1={barH / 2} y2={barH / 2}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={0.5}
      />
    </svg>
  );
}

// ── CALENDAR View ──

function CalendarView({ events, weekStart }: { events: EarningsEvent[]; weekStart: string }) {
  // Build 5 weekday columns
  const monday = new Date(weekStart + 'T00:00:00');
  const days: string[] = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().slice(0, 10));
  }

  // Group events by date
  const byDate = new Map<string, EarningsEvent[]>();
  for (const e of events) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  return (
    <div className="grid grid-cols-5 gap-px bg-border/10 min-h-0">
      {days.map(date => {
        const today = isToday(date);
        const dayEvents = byDate.get(date) || [];
        const bmo = dayEvents.filter(e => e.time === 'BMO');
        const amc = dayEvents.filter(e => e.time === 'AMC' || e.time === 'DMH');

        return (
          <div
            key={date}
            className={`bg-black flex flex-col min-w-0 ${today ? 'ring-1 ring-inset ring-yellow-400/30' : ''}`}
          >
            {/* Day header */}
            <div className={`px-1.5 py-1 text-center border-b border-border/20 ${today ? 'bg-yellow-400/[0.08]' : 'bg-white/[0.02]'}`}>
              <div className={`text-[8px] font-mono uppercase tracking-wider ${today ? 'text-yellow-400 font-bold' : 'text-neutral/50'}`}>
                {dayLabel(date)}
              </div>
              {today && (
                <div className="text-[7px] font-mono text-yellow-400/60 uppercase">TODAY</div>
              )}
            </div>

            {/* BMO section */}
            {bmo.length > 0 && (
              <div className="border-b border-border/10">
                <div className="text-[7px] font-mono text-neutral/30 uppercase px-1 py-0.5 bg-white/[0.01]">BMO</div>
                {bmo.map(e => (
                  <CalendarCard key={e.symbol} event={e} />
                ))}
              </div>
            )}

            {/* AMC section */}
            {amc.length > 0 && (
              <div>
                <div className="text-[7px] font-mono text-neutral/30 uppercase px-1 py-0.5 bg-white/[0.01]">AMC</div>
                {amc.map(e => (
                  <CalendarCard key={e.symbol} event={e} />
                ))}
              </div>
            )}

            {dayEvents.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-4">
                <span className="text-[8px] font-mono text-neutral/20 uppercase">No events</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CalendarCard({ event: e }: { event: EarningsEvent }) {
  const cardBg = !e.reported
    ? 'bg-white/[0.02] hover:bg-yellow-400/[0.04]'
    : e.epsSurprise != null && e.epsSurprise >= 0
      ? 'bg-green-500/[0.05] hover:bg-green-500/[0.08]'
      : 'bg-red-500/[0.05] hover:bg-red-500/[0.08]';

  return (
    <div className={`px-1.5 py-1 border-b border-border/5 ${cardBg} transition-colors cursor-default`}>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono font-bold text-yellow-400">{e.symbol}</span>
        {e.reported ? (
          <span className={`text-[8px] font-mono font-bold ${pctColor(e.epsSurprise)}`}>
            {e.epsSurprise != null && e.epsSurprise >= 0 ? 'BEAT' : 'MISS'}
          </span>
        ) : (
          <span className="text-[8px] font-mono text-neutral/40">{fmtPct(e.expectedMove, 1).replace('+', '')}</span>
        )}
      </div>
      {e.reported && e.priceReaction != null && (
        <div className={`text-[8px] font-mono ${pctColor(e.priceReaction)}`}>
          {fmtPct(e.priceReaction)}
        </div>
      )}
    </div>
  );
}

// ── TABLE View ──

function TableView({ events }: { events: EarningsEvent[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const arr = [...events];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.date.localeCompare(b.date); break;
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'surprise': cmp = (a.epsSurprise ?? -999) - (b.epsSurprise ?? -999); break;
        case 'expectedMove': cmp = a.expectedMove - b.expectedMove; break;
        case 'marketCap': cmp = a.marketCap - b.marketCap; break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [events, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return null;
    return sortDir === 'asc'
      ? <ChevronUp size={8} className="inline ml-0.5" />
      : <ChevronDown size={8} className="inline ml-0.5" />;
  };

  return (
    <div className="overflow-auto">
      <table className="w-full text-[9px] font-mono min-w-[900px]">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-yellow-400/60" onClick={() => toggleSort('date')}>
              Date<SortIcon k="date" />
            </th>
            <th className="text-left px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Time</th>
            <th className="text-left px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-yellow-400/60" onClick={() => toggleSort('symbol')}>
              Symbol<SortIcon k="symbol" />
            </th>
            <th className="text-left px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Name</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Act</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-yellow-400/60" onClick={() => toggleSort('surprise')}>
              Surprise<SortIcon k="surprise" />
            </th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Est</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Act</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium cursor-pointer hover:text-yellow-400/60" onClick={() => toggleSort('expectedMove')}>
              Exp Move<SortIcon k="expectedMove" />
            </th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Avg Move</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Reaction</th>
            <th className="text-center px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">History</th>
            <th className="text-left px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const today = isToday(e.date);
            const rowBg = today
              ? 'bg-yellow-400/[0.03]'
              : surpriseBg(e.epsSurprise, e.reported);

            return (
              <tr
                key={`${e.symbol}-${e.date}`}
                className={`border-b border-border/5 ${rowBg} hover:bg-yellow-400/[0.02] transition-colors`}
              >
                <td className="px-1.5 py-1 text-neutral/60 whitespace-nowrap">{e.date.slice(5)}</td>
                <td className="px-1 py-1">
                  <span className={`text-[8px] px-1 py-0.5 ${
                    e.time === 'BMO' ? 'text-blue-400 bg-blue-500/10' :
                    e.time === 'AMC' ? 'text-purple-400 bg-purple-500/10' :
                    'text-neutral/50 bg-white/5'
                  }`}>
                    {e.time}
                  </span>
                </td>
                <td className="px-1 py-1 font-bold text-yellow-400">{e.symbol}</td>
                <td className="px-1 py-1 text-neutral/50 truncate max-w-[120px]">{e.name}</td>
                <td className="text-right px-1 py-1 text-neutral/60">{fmtEps(e.epsEstimate)}</td>
                <td className={`text-right px-1 py-1 font-bold ${e.reported ? pctColor(e.epsSurprise) : 'text-neutral/30'}`}>
                  {fmtEps(e.epsActual)}
                </td>
                <td className={`text-right px-1 py-1 font-bold ${pctColor(e.epsSurprise)}`}>
                  {fmtPct(e.epsSurprise)}
                </td>
                <td className="text-right px-1 py-1 text-neutral/50">{fmtRevenue(e.revenueEstimate)}</td>
                <td className={`text-right px-1 py-1 ${e.reported ? pctColor(e.revenueSurprise) : 'text-neutral/30'}`}>
                  {fmtRevenue(e.revenueActual)}
                </td>
                <td className="text-right px-1 py-1 text-yellow-400/80">{e.expectedMove.toFixed(1)}%</td>
                <td className="text-right px-1 py-1 text-neutral/50">{e.avgHistoricalMove.toFixed(1)}%</td>
                <td className={`text-right px-1 py-1 font-bold ${pctColor(e.priceReaction)}`}>
                  {fmtPct(e.priceReaction)}
                </td>
                <td className="text-center px-1 py-1">
                  <SurpriseSpark history={e.surpriseHistory} />
                </td>
                <td className="px-1 py-1 text-neutral/40 truncate max-w-[100px]">{e.sector}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── HEATMAP View ──

function HeatmapView({ events }: { events: EarningsEvent[] }) {
  // Color by expected move magnitude (or actual move if reported)
  const maxMove = Math.max(...events.map(e => e.reported && e.priceReaction != null ? Math.abs(e.priceReaction) : e.expectedMove), 1);
  const maxCap = Math.max(...events.map(e => e.marketCap), 1);

  return (
    <div className="flex flex-wrap gap-px p-1">
      {events.map(e => {
        const move = e.reported && e.priceReaction != null ? e.priceReaction : null;
        const displayMove = move != null ? Math.abs(move) : e.expectedMove;
        const intensity = Math.min(displayMove / maxMove, 1);

        // Size by market cap: min 56px, max 110px
        const capRatio = Math.sqrt(e.marketCap / maxCap);
        const size = Math.round(56 + capRatio * 54);

        let bgColor: string;
        if (e.reported && move != null) {
          // Actual: green for positive, red for negative
          bgColor = move >= 0
            ? `rgba(74,222,128,${0.08 + intensity * 0.22})`
            : `rgba(248,113,113,${0.08 + intensity * 0.22})`;
        } else {
          // Pending: yellow for expected move magnitude
          bgColor = `rgba(234,179,8,${0.04 + intensity * 0.16})`;
        }

        return (
          <div
            key={`${e.symbol}-${e.date}`}
            className="border border-border/10 flex flex-col items-center justify-center cursor-default hover:bg-yellow-400/[0.02] transition-colors"
            style={{ width: size, height: size, backgroundColor: bgColor }}
            title={`${e.symbol} - ${e.name}\nDate: ${e.date} ${e.time}\nExpected Move: ${e.expectedMove}%${e.reported ? `\nActual: ${fmtPct(e.priceReaction)}` : ''}`}
          >
            <div className="text-[10px] font-mono font-bold text-white/90">{e.symbol}</div>
            <div className={`text-[8px] font-mono font-bold ${
              e.reported && move != null
                ? pctColor(move)
                : 'text-yellow-400/70'
            }`}>
              {e.reported && move != null ? fmtPct(move) : `${e.expectedMove.toFixed(1)}%`}
            </div>
            <div className="text-[7px] font-mono text-neutral/30">{e.date.slice(5)}</div>
            {e.reported && (
              <div className={`text-[7px] font-mono ${pctColor(e.epsSurprise)}`}>
                {e.epsSurprise != null && e.epsSurprise >= 0 ? 'BEAT' : 'MISS'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function EarningsCalendarPanel() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('CALENDAR');
  const { data, isLoading, refetch, dataUpdatedAt } = useEarningsCalendarHeatmap();

  const events = data?.events ?? [];

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-yellow-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {tr(t, 'panelEarningsCalendar', 'EARNINGS CALENDAR')}
          </span>
          {data && (
            <span className="px-1.5 py-0.5 text-[8px] font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
              {data.totalThisWeek}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-yellow-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-black/20 shrink-0">
        {(['CALENDAR', 'TABLE', 'HEATMAP'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider transition-all ${
              view === v
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-neutral/40 hover:text-white'
            }`}
          >
            {v}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-[8px] font-mono text-neutral/30">
            {data.weekStart} — {data.weekEnd}
          </span>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 animate-spin" />
          </div>
        ) : !data || events.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {tr(t, 'ecNoData', 'No earnings data available')}
          </div>
        ) : (
          <>
            {view === 'CALENDAR' && (
              <CalendarView events={events} weekStart={data.weekStart} />
            )}
            {view === 'TABLE' && (
              <TableView events={events} />
            )}
            {view === 'HEATMAP' && (
              <HeatmapView events={events} />
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/20 text-[8px] font-mono text-neutral/30 shrink-0">
        <span>
          {events.length} {tr(t, 'ecEvents', 'events')} / {events.filter(e => e.reported).length} {tr(t, 'ecReported', 'reported')}
        </span>
        <span>
          {events.filter(e => e.reported && e.epsSurprise != null && e.epsSurprise >= 0).length}/{events.filter(e => e.reported).length} {tr(t, 'ecBeats', 'beats')}
        </span>
      </div>
    </GlassCard>
  );
}
