import { useState, useMemo } from 'react';
import {
  useEventDriven,
  type CorporateEvent,
} from '../../api/hooks/use-event-driven';
import { useT, tr, TFn } from '../../i18n';
import { Zap, RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const AMBER = '#f59e0b';
const AMBER_DIM = 'rgba(245,158,11,0.15)';
const GREEN = '#34d399';
const RED = '#f87171';
const BLUE = '#60a5fa';
const YELLOW = '#fbbf24';
const ORANGE = '#fb923c';

type ViewMode = 'TABLE' | 'PIPELINE' | 'ARBS';
type TypeFilter = 'ALL' | 'M&A' | 'SPINOFF' | 'ACTIVIST' | 'BUYBACK' | 'RESTRUCTURING' | 'OTHER';
type SortKey = 'type' | 'target' | 'acquirer' | 'dealValue' | 'premium' | 'status' | 'spread' | 'annReturn' | 'probability' | 'daysToClose' | 'risk';

const TYPE_FILTERS: TypeFilter[] = ['ALL', 'M&A', 'SPINOFF', 'ACTIVIST', 'BUYBACK', 'RESTRUCTURING', 'OTHER'];
const OTHER_TYPES = new Set(['IPO_LOCK_EXPIRY', 'TENDER_OFFER', 'RIGHTS_ISSUE']);

// ── Formatting ──

function fmtDollar(n: number | null): string {
  if (n == null) return '--';
  return '$' + n.toFixed(1) + 'B';
}

function fmtPct(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function fmtDays(n: number | null): string {
  if (n == null) return '--';
  return n + 'd';
}

// ── Color helpers ──

function typeColor(type: string): { color: string; bg: string } {
  switch (type) {
    case 'M&A': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'SPINOFF': return { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
    case 'ACTIVIST': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    case 'BUYBACK': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'RESTRUCTURING': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'TENDER_OFFER': return { color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
    case 'IPO_LOCK_EXPIRY': return { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    case 'RIGHTS_ISSUE': return { color: '#67e8f9', bg: 'rgba(103,232,249,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function statusColor(status: string): { color: string; bg: string } {
  switch (status) {
    case 'ANNOUNCED': return { color: BLUE, bg: 'rgba(96,165,250,0.12)' };
    case 'PENDING': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'REGULATORY_REVIEW': return { color: ORANGE, bg: 'rgba(251,146,60,0.12)' };
    case 'CLOSED': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'TERMINATED': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function riskColor(risk: string): { color: string; bg: string } {
  switch (risk) {
    case 'LOW': return { color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'MODERATE': return { color: YELLOW, bg: 'rgba(251,191,36,0.12)' };
    case 'HIGH': return { color: RED, bg: 'rgba(248,113,113,0.12)' };
    default: return { color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)' };
  }
}

function signalColor(signal: string | null): { color: string; text: string } {
  switch (signal) {
    case 'SPREAD_WIDENING': return { color: RED, text: 'WIDEN' };
    case 'SPREAD_TIGHTENING': return { color: GREEN, text: 'TIGHT' };
    case 'NEW_DEAL': return { color: BLUE, text: 'NEW' };
    case 'REGULATORY_RISK': return { color: ORANGE, text: 'REG RISK' };
    case 'ACTIVIST_ENTRY': return { color: AMBER, text: 'ACTIVIST' };
    default: return { color: 'rgba(255,255,255,0.15)', text: '--' };
  }
}

// ── Sparkline ──

function SpreadSparkline({ data, width = 52, height = 12 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={AMBER}
        strokeWidth={0.8}
        strokeOpacity={0.6}
      />
    </svg>
  );
}

// ── Filter + Sort logic ──

function filterEvents(events: CorporateEvent[], filter: TypeFilter): CorporateEvent[] {
  if (filter === 'ALL') return events;
  if (filter === 'OTHER') return events.filter(e => OTHER_TYPES.has(e.type));
  return events.filter(e => e.type === filter);
}

function sortEvents(events: CorporateEvent[], sortKey: SortKey, sortDir: 'asc' | 'desc'): CorporateEvent[] {
  const dir = sortDir === 'asc' ? 1 : -1;
  return [...events].sort((a, b) => {
    let va: number | string;
    let vb: number | string;
    switch (sortKey) {
      case 'type': va = a.type; vb = b.type; break;
      case 'target': va = a.target; vb = b.target; break;
      case 'acquirer': va = a.acquirer ?? ''; vb = b.acquirer ?? ''; break;
      case 'dealValue': va = a.dealValue ?? -1; vb = b.dealValue ?? -1; break;
      case 'premium': va = a.premium ?? -1; vb = b.premium ?? -1; break;
      case 'status': va = a.status; vb = b.status; break;
      case 'spread': va = a.currentSpread ?? -1; vb = b.currentSpread ?? -1; break;
      case 'annReturn': va = a.annualizedReturn ?? -1; vb = b.annualizedReturn ?? -1; break;
      case 'probability': va = a.probability ?? -1; vb = b.probability ?? -1; break;
      case 'daysToClose': va = a.daysToClose ?? 9999; vb = b.daysToClose ?? 9999; break;
      case 'risk': {
        const riskOrder: Record<string, number> = { HIGH: 3, MODERATE: 2, LOW: 1 };
        va = riskOrder[a.riskLevel] ?? 0;
        vb = riskOrder[b.riskLevel] ?? 0;
        break;
      }
      default: va = 0; vb = 0;
    }
    if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
    return ((va as number) - (vb as number)) * dir;
  });
}

// ── TABLE View ──

function TableView({ events }: { events: CorporateEvent[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('dealValue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => sortEvents(events, sortKey, sortDir), [events, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';

  const th = (label: string, key: SortKey, w: string) => (
    <button
      onClick={() => handleSort(key)}
      className={`${w} text-left text-[5px] font-mono font-bold uppercase tracking-wider shrink-0 hover:text-amber-400/60 transition-colors`}
      style={{ color: sortKey === key ? AMBER : 'rgba(255,255,255,0.2)' }}
    >
      {label}{sortArrow(key)}
    </button>
  );

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-white/[0.06] sticky top-0 bg-black z-10">
        {th('TYPE', 'type', 'w-14')}
        {th('TARGET', 'target', 'w-20')}
        {th('ACQUIRER', 'acquirer', 'w-20')}
        {th('VALUE', 'dealValue', 'w-12')}
        {th('PREM', 'premium', 'w-10')}
        {th('STATUS', 'status', 'w-16')}
        {th('SPREAD', 'spread', 'w-10')}
        {th('ANN.R', 'annReturn', 'w-10')}
        {th('PROB', 'probability', 'w-9')}
        {th('DAYS', 'daysToClose', 'w-9')}
        {th('RISK', 'risk', 'w-12')}
        <span className="w-12 text-[5px] font-mono text-white/20 uppercase shrink-0">SIGNAL</span>
        <span className="w-28 text-[5px] font-mono text-white/20 uppercase shrink-0">CATALYST</span>
        <span className="w-[52px] text-[5px] font-mono text-white/20 uppercase shrink-0 text-right">SPREAD</span>
      </div>

      {/* Rows */}
      {sorted.map(evt => {
        const tc = typeColor(evt.type);
        const sc = statusColor(evt.status);
        const rc = riskColor(evt.riskLevel);
        const sig = signalColor(evt.signal);

        return (
          <div
            key={evt.id}
            className="flex items-center gap-1 px-2 py-0.5 border-b border-white/[0.02] hover:bg-amber-400/[0.02] transition-colors"
          >
            {/* Type badge */}
            <span
              className="w-14 text-[6px] font-mono font-black uppercase px-1 py-0 shrink-0 truncate"
              style={{ color: tc.color, backgroundColor: tc.bg }}
            >
              {evt.type.replace('_', ' ')}
            </span>
            {/* Target */}
            <span className="w-20 text-[7px] font-mono font-bold text-white/70 truncate shrink-0" title={evt.target}>
              {evt.targetTicker}
            </span>
            {/* Acquirer */}
            <span className="w-20 text-[7px] font-mono text-white/40 truncate shrink-0" title={evt.acquirer ?? ''}>
              {evt.acquirerTicker ?? evt.acquirer ?? '--'}
            </span>
            {/* Deal Value */}
            <span className="w-12 text-[7px] font-mono text-white/50 text-right shrink-0">
              {fmtDollar(evt.dealValue)}
            </span>
            {/* Premium */}
            <span className="w-10 text-[7px] font-mono text-right shrink-0" style={{ color: evt.premium != null ? GREEN : 'rgba(255,255,255,0.2)' }}>
              {fmtPct(evt.premium)}
            </span>
            {/* Status badge */}
            <span
              className="w-16 text-[5px] font-mono font-black uppercase px-1 py-0 shrink-0 truncate"
              style={{ color: sc.color, backgroundColor: sc.bg }}
            >
              {evt.status.replace('_', ' ')}
            </span>
            {/* Spread */}
            <span className="w-10 text-[7px] font-mono font-bold text-right shrink-0" style={{ color: evt.currentSpread != null ? AMBER : 'rgba(255,255,255,0.15)' }}>
              {fmtPct(evt.currentSpread)}
            </span>
            {/* Ann Return */}
            <span className="w-10 text-[7px] font-mono font-bold text-right shrink-0" style={{ color: evt.annualizedReturn != null ? GREEN : 'rgba(255,255,255,0.15)' }}>
              {fmtPct(evt.annualizedReturn)}
            </span>
            {/* Probability */}
            <span className="w-9 text-[7px] font-mono text-right shrink-0" style={{ color: evt.probability != null ? (evt.probability >= 80 ? GREEN : evt.probability >= 50 ? YELLOW : RED) : 'rgba(255,255,255,0.15)' }}>
              {evt.probability != null ? evt.probability + '%' : '--'}
            </span>
            {/* Days to Close */}
            <span className="w-9 text-[7px] font-mono text-right shrink-0 text-white/40">
              {fmtDays(evt.daysToClose)}
            </span>
            {/* Risk badge */}
            <span
              className="w-12 text-[5px] font-mono font-black uppercase px-1 py-0 shrink-0"
              style={{ color: rc.color, backgroundColor: rc.bg }}
            >
              {evt.riskLevel}
            </span>
            {/* Signal */}
            <span
              className="w-12 text-[5px] font-mono font-bold uppercase shrink-0 truncate"
              style={{ color: sig.color }}
            >
              {sig.text}
            </span>
            {/* Catalyst */}
            <span className="w-28 text-[6px] font-mono text-white/30 truncate shrink-0" title={evt.catalyst}>
              {evt.catalyst}
            </span>
            {/* Sparkline */}
            <div className="w-[52px] shrink-0 flex justify-end">
              <SpreadSparkline data={evt.spreadHistory} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PIPELINE View ──

const PIPELINE_COLS: { status: string; label: string; color: string }[] = [
  { status: 'ANNOUNCED', label: 'ANNOUNCED', color: BLUE },
  { status: 'PENDING', label: 'PENDING', color: YELLOW },
  { status: 'REGULATORY_REVIEW', label: 'REGULATORY', color: ORANGE },
  { status: 'CLOSED', label: 'CLOSED', color: GREEN },
  { status: 'TERMINATED', label: 'TERMINATED', color: RED },
];

function PipelineView({ events }: { events: CorporateEvent[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, CorporateEvent[]>();
    for (const col of PIPELINE_COLS) map.set(col.status, []);
    for (const evt of events) {
      const list = map.get(evt.status);
      if (list) list.push(evt);
    }
    return map;
  }, [events]);

  return (
    <div className="flex gap-1 p-1 overflow-x-auto h-full">
      {PIPELINE_COLS.map(col => {
        const items = grouped.get(col.status) ?? [];
        return (
          <div key={col.status} className="flex flex-col min-w-[130px] flex-1">
            {/* Column header */}
            <div
              className="flex items-center justify-between px-1.5 py-0.5 mb-0.5"
              style={{ borderBottom: `1px solid ${col.color}33` }}
            >
              <span className="text-[6px] font-mono font-black uppercase" style={{ color: col.color }}>
                {col.label}
              </span>
              <span
                className="text-[5px] font-mono font-bold px-1"
                style={{ color: col.color, backgroundColor: `${col.color}15` }}
              >
                {items.length}
              </span>
            </div>
            {/* Cards */}
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {items.map(evt => {
                const rc = riskColor(evt.riskLevel);
                const tc = typeColor(evt.type);
                return (
                  <div
                    key={evt.id}
                    className="px-1.5 py-1 border border-white/[0.04] hover:bg-amber-400/[0.02] transition-colors"
                    style={{ borderLeft: `2px solid ${rc.color}` }}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className="text-[5px] font-mono font-black uppercase px-0.5"
                        style={{ color: tc.color, backgroundColor: tc.bg }}
                      >
                        {evt.type.replace('_', ' ')}
                      </span>
                      <span
                        className="text-[5px] font-mono font-bold px-0.5"
                        style={{ color: rc.color, backgroundColor: rc.bg }}
                      >
                        {evt.riskLevel}
                      </span>
                    </div>
                    <div className="text-[7px] font-mono font-bold text-white/70 truncate">
                      {evt.targetTicker}
                    </div>
                    {evt.acquirer && (
                      <div className="text-[6px] font-mono text-white/30 truncate">
                        {evt.acquirerTicker ?? evt.acquirer}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-[6px] font-mono text-white/40">
                        {fmtDollar(evt.dealValue)}
                      </span>
                      {evt.currentSpread != null && (
                        <span className="text-[6px] font-mono font-bold" style={{ color: AMBER }}>
                          {fmtPct(evt.currentSpread)}
                        </span>
                      )}
                    </div>
                    {evt.daysToClose != null && (
                      <div className="text-[5px] font-mono text-white/20 mt-0.5">
                        {evt.daysToClose}d to close
                      </div>
                    )}
                  </div>
                );
              })}
              {items.length === 0 && (
                <div className="text-[6px] font-mono text-white/10 text-center py-4">
                  No deals
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ARBS View (Merger Arbitrage) ──

function ArbsView({ events }: { events: CorporateEvent[] }) {
  // Filter to M&A and Tender Offer only, with spread data
  const arbDeals = useMemo(() =>
    events.filter(e =>
      (e.type === 'M&A' || e.type === 'TENDER_OFFER') &&
      e.currentSpread != null &&
      e.status !== 'TERMINATED' &&
      e.status !== 'CLOSED'
    ),
    [events]
  );

  const avgSpread = arbDeals.length > 0
    ? arbDeals.reduce((s, e) => s + (e.currentSpread ?? 0), 0) / arbDeals.length
    : 0;
  const avgAnnReturn = arbDeals.length > 0
    ? arbDeals.filter(e => e.annualizedReturn != null).reduce((s, e) => s + (e.annualizedReturn ?? 0), 0) / (arbDeals.filter(e => e.annualizedReturn != null).length || 1)
    : 0;
  const winRate = arbDeals.length > 0
    ? Math.round((arbDeals.filter(e => (e.probability ?? 0) >= 70).length / arbDeals.length) * 100)
    : 0;

  // For bar chart
  const maxSpread = Math.max(...arbDeals.map(e => e.currentSpread ?? 0), 1);
  const maxAnnReturn = Math.max(...arbDeals.map(e => e.annualizedReturn ?? 0), 1);

  // For scatter plot
  const maxDealValue = Math.max(...arbDeals.map(e => e.dealValue ?? 1), 1);

  return (
    <div className="overflow-y-auto">
      {/* Summary stats */}
      <div className="flex items-center gap-3 px-2 py-1.5 border-b border-white/[0.06]">
        <div className="flex flex-col">
          <span className="text-[5px] font-mono text-white/20 uppercase">Avg Spread</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: AMBER }}>{avgSpread.toFixed(2)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[5px] font-mono text-white/20 uppercase">Avg Ann Return</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: GREEN }}>{avgAnnReturn.toFixed(1)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[5px] font-mono text-white/20 uppercase">Win Rate (&gt;70% prob)</span>
          <span className="text-[9px] font-mono font-bold" style={{ color: winRate >= 70 ? GREEN : YELLOW }}>{winRate}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[5px] font-mono text-white/20 uppercase">Active Deals</span>
          <span className="text-[9px] font-mono font-bold text-white/60">{arbDeals.length}</span>
        </div>
      </div>

      {/* Bar chart: Spread vs Annualized Return */}
      <div className="px-2 py-1.5 border-b border-white/[0.06]">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Spread vs Annualized Return</span>
        <div className="mt-1 space-y-0.5">
          {arbDeals.map(evt => (
            <div key={evt.id} className="flex items-center gap-1">
              <span className="w-10 text-[6px] font-mono font-bold text-white/60 truncate shrink-0">{evt.targetTicker}</span>
              <div className="flex-1 flex items-center gap-0.5 h-3">
                {/* Spread bar */}
                <div className="flex-1 h-full bg-white/[0.02] relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${((evt.currentSpread ?? 0) / maxSpread) * 100}%`,
                      backgroundColor: AMBER,
                      opacity: 0.4,
                    }}
                  />
                </div>
                {/* Ann return bar */}
                <div className="flex-1 h-full bg-white/[0.02] relative overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full"
                    style={{
                      width: `${((evt.annualizedReturn ?? 0) / maxAnnReturn) * 100}%`,
                      backgroundColor: GREEN,
                      opacity: 0.4,
                    }}
                  />
                </div>
              </div>
              <span className="w-8 text-[6px] font-mono text-right shrink-0" style={{ color: AMBER }}>
                {fmtPct(evt.currentSpread)}
              </span>
              <span className="w-8 text-[6px] font-mono text-right shrink-0" style={{ color: GREEN }}>
                {fmtPct(evt.annualizedReturn)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-1" style={{ backgroundColor: AMBER, opacity: 0.4 }} />
            <span className="text-[5px] font-mono text-white/20">SPREAD</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-1" style={{ backgroundColor: GREEN, opacity: 0.4 }} />
            <span className="text-[5px] font-mono text-white/20">ANN. RETURN</span>
          </div>
        </div>
      </div>

      {/* Scatter plot: Probability vs Annualized Return, size = deal value */}
      <div className="px-2 py-1.5">
        <span className="text-[6px] font-mono text-white/25 uppercase tracking-wider">Risk / Reward Scatter</span>
        <div className="mt-1">
          <svg viewBox="0 0 200 120" className="w-full" style={{ maxHeight: 160 }}>
            {/* Grid */}
            <line x1="20" y1="0" x2="20" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            <line x1="20" y1="100" x2="200" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
            {/* X axis labels (probability) */}
            {[0, 25, 50, 75, 100].map(v => (
              <text key={`x-${v}`} x={20 + (v / 100) * 175} y={110} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="4" fontFamily="monospace">
                {v}%
              </text>
            ))}
            {/* Y axis labels (ann return) */}
            {[0, 10, 20, 30].map(v => (
              <text key={`y-${v}`} x={18} y={100 - (v / 35) * 95} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize="4" fontFamily="monospace">
                {v}%
              </text>
            ))}
            {/* Axis labels */}
            <text x="110" y="118" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="4" fontFamily="monospace">PROBABILITY</text>
            <text x="5" y="50" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="4" fontFamily="monospace" transform="rotate(-90, 5, 50)">ANN. RETURN</text>
            {/* Grid lines */}
            {[25, 50, 75].map(v => (
              <line key={`gx-${v}`} x1={20 + (v / 100) * 175} y1="0" x2={20 + (v / 100) * 175} y2="100" stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" />
            ))}
            {[10, 20, 30].map(v => (
              <line key={`gy-${v}`} x1="20" y1={100 - (v / 35) * 95} x2="200" y2={100 - (v / 35) * 95} stroke="rgba(255,255,255,0.03)" strokeWidth="0.3" />
            ))}
            {/* Data points */}
            {arbDeals.map(evt => {
              const cx = 20 + ((evt.probability ?? 50) / 100) * 175;
              const cy = 100 - ((evt.annualizedReturn ?? 0) / 35) * 95;
              const r = 3 + ((evt.dealValue ?? 1) / maxDealValue) * 6;
              const rc = riskColor(evt.riskLevel);
              return (
                <g key={evt.id}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={r}
                    fill={rc.color}
                    fillOpacity={0.2}
                    stroke={rc.color}
                    strokeWidth={0.5}
                    strokeOpacity={0.5}
                  />
                  <text
                    x={cx}
                    y={cy - r - 2}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.4)"
                    fontSize="3.5"
                    fontFamily="monospace"
                  >
                    {evt.targetTicker}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[5px] font-mono text-white/15">Size = deal value</span>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5" style={{ backgroundColor: GREEN, borderRadius: '50%', opacity: 0.5 }} />
            <span className="text-[5px] font-mono text-white/15">LOW</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5" style={{ backgroundColor: YELLOW, borderRadius: '50%', opacity: 0.5 }} />
            <span className="text-[5px] font-mono text-white/15">MOD</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5" style={{ backgroundColor: RED, borderRadius: '50%', opacity: 0.5 }} />
            <span className="text-[5px] font-mono text-white/15">HIGH</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Panel ──

export function EventDrivenPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEventDriven();
  const [view, setView] = useState<ViewMode>('TABLE');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');

  const filteredEvents = useMemo(() => {
    if (!data?.events) return [];
    return filterEvents(data.events, typeFilter);
  }, [data, typeFilter]);

  const views: { key: ViewMode; label: string }[] = [
    { key: 'TABLE', label: tr(t, 'edTable', 'TABLE') },
    { key: 'PIPELINE', label: tr(t, 'edPipeline', 'PIPELINE') },
    { key: 'ARBS', label: tr(t, 'edArbs', 'ARBS') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5" style={{ color: AMBER }} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: AMBER }}>
            {tr(t, 'edTitle', 'Event-Driven Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data && (
            <>
              <span
                className="text-[5px] font-black uppercase px-1 py-0.5"
                style={{ color: AMBER, backgroundColor: AMBER_DIM }}
              >
                {data.summary.totalDeals} DEALS
              </span>
              <span
                className="text-[5px] font-black uppercase px-1 py-0.5"
                style={{ color: AMBER, backgroundColor: AMBER_DIM }}
              >
                AVG {data.summary.avgSpread.toFixed(1)}% SPREAD
              </span>
            </>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Type filter + View toggle */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.06] shrink-0 bg-[#030303]">
        {/* Type filters */}
        <div className="flex items-center gap-0.5">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-1.5 py-0.5 text-[6px] font-mono font-black uppercase transition-all ${
                typeFilter === f
                  ? 'text-amber-400 bg-amber-400/[0.12]'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {f === 'M&A' ? 'M&A' : f}
            </button>
          ))}
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          {views.map(v => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={`px-1.5 py-0.5 text-[6px] font-mono font-black uppercase transition-all ${
                view === v.key
                  ? 'text-amber-400 bg-amber-400/[0.12]'
                  : 'text-white/30 hover:text-white/50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {view === 'TABLE' && <TableView events={filteredEvents} />}
            {view === 'PIPELINE' && <PipelineView events={filteredEvents} />}
            {view === 'ARBS' && <ArbsView events={data.events} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'edNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
