import { useState, useMemo } from 'react';
import {
  useCorporateCds,
  type CorporateCdsEntry,
  type CdsSectorSummary,
} from '../../api/hooks/use-corporate-cds';
import { useT, tr, TFn } from '../../i18n';
import { ShieldAlert, RefreshCw } from 'lucide-react';

// ── Constants ──

type ViewMode = 'TABLE' | 'SECTOR' | 'RANKING';
type SectorFilter = 'ALL' | 'BANKS' | 'TECH' | 'ENERGY' | 'TELECOM' | 'AUTO' | 'INDUSTRIALS' | 'HEALTHCARE' | 'RETAIL';
type SortKey =
  | 'entity' | 'rating' | 'cds5y' | 'change1d' | 'change1w' | 'change1m'
  | 'change3m' | 'impliedPd' | 'zSpread' | 'cdsBondBasis';

const SECTORS: SectorFilter[] = ['ALL', 'BANKS', 'TECH', 'ENERGY', 'TELECOM', 'AUTO', 'INDUSTRIALS', 'HEALTHCARE', 'RETAIL'];

const RATING_ORDER: Record<string, number> = {
  'AAA': 1, 'AA+': 2, 'AA': 3, 'AA-': 4, 'A+': 5, 'A': 6, 'A-': 7,
  'BBB+': 8, 'BBB': 9, 'BBB-': 10, 'BB+': 11, 'BB': 12, 'BB-': 13,
  'B+': 14, 'B': 15, 'B-': 16, 'CCC': 17,
};

const IG_RATINGS = new Set(['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-']);

// ── Color helpers ──

function getCdsColor(spread: number): string {
  if (spread > 200) return 'text-red-400';
  if (spread > 120) return 'text-orange-400';
  if (spread > 70) return 'text-yellow-400';
  return 'text-emerald-400';
}

function getChangeColor(value: number): string {
  // For CDS: positive change = widening = bad (red), negative = tightening = good (green)
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function getSignalInfo(signal: string | null): { label: string; color: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'WIDENING': return { label: 'WIDENING', color: 'text-red-400 bg-red-400/15' };
    case 'TIGHTENING': return { label: 'TIGHTEN', color: 'text-emerald-400 bg-emerald-400/15' };
    case 'CROSSOVER_RISK': return { label: 'XOVER RISK', color: 'text-orange-400 bg-orange-400/15' };
    case 'NEGATIVE_BASIS': return { label: 'NEG BASIS', color: 'text-blue-400 bg-blue-400/15' };
    default: return { label: signal, color: 'text-neutral-400 bg-neutral-400/10' };
  }
}

function getRatingColor(rating: string): string {
  if (rating === 'AAA') return 'text-emerald-300';
  if (rating.startsWith('AA')) return 'text-emerald-400';
  if (rating.startsWith('A')) return 'text-blue-400';
  if (rating.startsWith('BBB')) return 'text-yellow-400';
  if (rating.startsWith('BB')) return 'text-orange-400';
  return 'text-red-400';
}

function getRatingBarColor(rating: string): string {
  if (rating === 'AAA') return '#6ee7b7';
  if (rating.startsWith('AA')) return '#34d399';
  if (rating.startsWith('A')) return '#60a5fa';
  if (rating.startsWith('BBB')) return '#fbbf24';
  if (rating.startsWith('BB')) return '#fb923c';
  return '#f87171';
}

// ── Sorting ──

function sortEntries(entries: CorporateCdsEntry[], sortKey: SortKey, asc: boolean): CorporateCdsEntry[] {
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'entity': cmp = a.entity.localeCompare(b.entity); break;
      case 'rating': cmp = (RATING_ORDER[a.rating] ?? 99) - (RATING_ORDER[b.rating] ?? 99); break;
      case 'cds5y': cmp = a.cds5y - b.cds5y; break;
      case 'change1d': cmp = a.change1d - b.change1d; break;
      case 'change1w': cmp = a.change1w - b.change1w; break;
      case 'change1m': cmp = a.change1m - b.change1m; break;
      case 'change3m': cmp = a.change3m - b.change3m; break;
      case 'impliedPd': cmp = a.impliedPd - b.impliedPd; break;
      case 'zSpread': cmp = a.zSpread - b.zSpread; break;
      case 'cdsBondBasis': cmp = a.cdsBondBasis - b.cdsBondBasis; break;
      default: cmp = 0;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Sparkline ──

function CdsSparkline({ values }: { values: number[] }) {
  const W = 48;
  const H = 14;
  const PAD = 1;

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (v - min) / range) * (H - PAD * 2),
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  // Color based on trend: last > first = widening (red), else green
  const trend = values[values.length - 1] > values[0];
  const color = trend ? '#f87171' : '#34d399';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="inline-block" style={{ width: 48, height: 14 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.5}
        fill={color}
      />
    </svg>
  );
}

// ── 52W Range Bar ──

function RangeBar({ current, high, low }: { current: number; high: number; low: number }) {
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[7px] font-mono text-neutral-600 w-6 text-right">{low.toFixed(0)}</span>
      <div className="w-12 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 h-full bg-pink-400/30"
          style={{ left: 0, width: '100%' }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-pink-400"
          style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-600 w-6">{high.toFixed(0)}</span>
    </div>
  );
}

// ── Table header cell ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-pink-400 select-none whitespace-nowrap"
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive && (
        <span className="ml-0.5 text-pink-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      )}
    </th>
  );
}

// ── Main Panel ──

export function CorporateCdsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCorporateCds();

  const [view, setView] = useState<ViewMode>('TABLE');
  const [sectorFilter, setSectorFilter] = useState<SectorFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('cds5y');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'entity' || key === 'rating');
    }
  };

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    let entries = data.entries;
    if (sectorFilter !== 'ALL') {
      entries = entries.filter((e) => e.sector.toUpperCase() === sectorFilter);
    }
    return sortEntries(entries, sortKey, sortAsc);
  }, [data, sectorFilter, sortKey, sortAsc]);

  const filteredSectorSummary = useMemo(() => {
    if (!data) return [];
    if (sectorFilter === 'ALL') return data.sectorSummary;
    return data.sectorSummary.filter((s) => s.sector.toUpperCase() === sectorFilter);
  }, [data, sectorFilter]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-pink-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-pink-400">
            {tr(t, 'corpCdsTitle', 'Corporate CDS')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <>
              <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-blue-400 bg-blue-400/10 border border-blue-400/30">
                CDX IG {data.igIndex}
                <span className={`ml-1 ${getChangeColor(data.igIndexChange)}`}>
                  {data.igIndexChange > 0 ? '+' : ''}{data.igIndexChange.toFixed(1)}
                </span>
              </span>
              <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-orange-400 bg-orange-400/10 border border-orange-400/30">
                CDX HY {data.hyIndex}
                <span className={`ml-1 ${getChangeColor(data.hyIndexChange)}`}>
                  {data.hyIndexChange > 0 ? '+' : ''}{data.hyIndexChange.toFixed(1)}
                </span>
              </span>
            </>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-pink-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0 gap-2 flex-wrap">
        {/* Sector filter */}
        <div className="flex items-center gap-0.5 flex-wrap">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSectorFilter(s)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors whitespace-nowrap ${
                sectorFilter === s
                  ? 'text-pink-400 bg-pink-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-0.5">
          {(['TABLE', 'SECTOR', 'RANKING'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 transition-colors ${
                view === v
                  ? 'text-pink-400 bg-pink-400/15'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-pink-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'corpCdsNoData', 'No data available')}
          </div>
        )}

        {data && view === 'TABLE' && (
          <TableView
            entries={filteredEntries}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
          />
        )}

        {data && view === 'SECTOR' && (
          <SectorView summaries={filteredSectorSummary} />
        )}

        {data && view === 'RANKING' && (
          <RankingView entries={filteredEntries} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'corpCdsLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TABLE View ──

function TableView({
  entries,
  sortKey,
  sortAsc,
  onSort,
}: {
  entries: CorporateCdsEntry[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <Th label="Entity" sortKey="entity" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Rating" sortKey="rating" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="CDS 5Y" sortKey="cds5y" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label={'\u03941D'} sortKey="change1d" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label={'\u03941W'} sortKey="change1w" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label={'\u03941M'} sortKey="change1m" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label={'\u03943M'} sortKey="change3m" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              52W Range
            </th>
            <Th label="Impl PD" sortKey="impliedPd" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Z-Sprd" sortKey="zSpread" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <Th label="Basis" sortKey="cdsBondBasis" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Signal
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Spark
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <TableRow key={entry.ticker} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ entry }: { entry: CorporateCdsEntry }) {
  const signalInfo = getSignalInfo(entry.signal);

  return (
    <tr className="border-b border-border/10 hover:bg-pink-400/[0.02] transition-colors">
      {/* Entity (ticker) */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <span className="text-white font-bold">{entry.ticker}</span>
        <span className="text-[7px] text-neutral-600 ml-1">{entry.entity}</span>
      </td>

      {/* Rating */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getRatingColor(entry.rating)}`}>
        {entry.rating}
      </td>

      {/* CDS 5Y */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getCdsColor(entry.cds5y)}`}>
        {entry.cds5y.toFixed(1)}
      </td>

      {/* Change 1D */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${getChangeColor(entry.change1d)}`}>
        {entry.change1d > 0 ? '+' : ''}{entry.change1d.toFixed(1)}
      </td>

      {/* Change 1W */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getChangeColor(entry.change1w)}`}>
        {entry.change1w > 0 ? '+' : ''}{entry.change1w.toFixed(1)}
      </td>

      {/* Change 1M */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getChangeColor(entry.change1m)}`}>
        {entry.change1m > 0 ? '+' : ''}{entry.change1m.toFixed(1)}
      </td>

      {/* Change 3M */}
      <td className={`px-1.5 py-1 whitespace-nowrap ${getChangeColor(entry.change3m)}`}>
        {entry.change3m > 0 ? '+' : ''}{entry.change3m.toFixed(1)}
      </td>

      {/* 52W Range Bar */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <RangeBar current={entry.cds5y} high={entry.high52w} low={entry.low52w} />
      </td>

      {/* Implied PD */}
      <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
        {entry.impliedPd.toFixed(2)}%
      </td>

      {/* Z-Spread */}
      <td className="px-1.5 py-1 whitespace-nowrap text-neutral-300">
        {entry.zSpread.toFixed(1)}
      </td>

      {/* CDS-Bond Basis */}
      <td className={`px-1.5 py-1 whitespace-nowrap font-bold ${
        entry.cdsBondBasis < 0 ? 'text-blue-400' : 'text-neutral-400'
      }`}>
        {entry.cdsBondBasis > 0 ? '+' : ''}{entry.cdsBondBasis.toFixed(1)}
      </td>

      {/* Signal */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        {signalInfo && (
          <span className={`text-[7px] font-bold px-1 py-0.5 ${signalInfo.color}`}>
            {signalInfo.label}
          </span>
        )}
      </td>

      {/* Sparkline */}
      <td className="px-1.5 py-1 whitespace-nowrap">
        <CdsSparkline values={entry.history} />
      </td>
    </tr>
  );
}

// ── SECTOR View ──

function SectorView({ summaries }: { summaries: CdsSectorSummary[] }) {
  const t = useT();
  const maxSpread = useMemo(() => {
    return Math.max(...summaries.map((s) => s.avgSpread), 1);
  }, [summaries]);

  return (
    <div className="px-3 py-2 space-y-3">
      {/* Sector summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
        {summaries.map((s) => (
          <div key={s.sector} className="p-2 border border-border/20 bg-[#060606] hover:bg-pink-400/[0.02] transition-colors">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-black text-white uppercase">{s.sector}</span>
              <span className={`text-[7px] font-mono font-bold px-1 py-0.5 ${
                s.change1d > 0
                  ? 'text-red-400 bg-red-400/10'
                  : s.change1d < 0
                    ? 'text-emerald-400 bg-emerald-400/10'
                    : 'text-neutral-500 bg-neutral-500/10'
              }`}>
                {s.change1d > 0 ? '+' : ''}{s.change1d.toFixed(1)} bps
              </span>
            </div>
            <div className="flex items-baseline gap-1 mb-1.5">
              <span className={`text-[12px] font-mono font-bold ${getCdsColor(s.avgSpread)}`}>
                {s.avgSpread.toFixed(1)}
              </span>
              <span className="text-[7px] font-mono text-neutral-600">avg bps</span>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">
                  {tr(t, 'corpCdsWidest', 'Widest')}
                </span>
                <span className="text-[7px] font-mono text-red-400">
                  {s.widest.entity} {s.widest.spread.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-mono text-neutral-600 uppercase">
                  {tr(t, 'corpCdsTightest', 'Tightest')}
                </span>
                <span className="text-[7px] font-mono text-emerald-400">
                  {s.tightest.entity} {s.tightest.spread.toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart comparing sector averages */}
      <div className="border border-border/20 bg-[#060606] p-2">
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'corpCdsSectorComparison', 'Sector Average Spread (bps)')}
        </div>
        <div className="space-y-1">
          {summaries.map((s) => {
            const pct = (s.avgSpread / maxSpread) * 100;
            return (
              <div key={s.sector} className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-neutral-400 w-20 text-right uppercase truncate">
                  {s.sector}
                </span>
                <div className="flex-1 h-3 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-pink-400/40"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[8px] font-mono font-bold w-10 text-right ${getCdsColor(s.avgSpread)}`}>
                  {s.avgSpread.toFixed(0)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── RANKING View ──

function RankingView({ entries }: { entries: CorporateCdsEntry[] }) {
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => b.cds5y - a.cds5y);
  }, [entries]);

  const maxSpread = useMemo(() => {
    return Math.max(...sorted.map((e) => e.cds5y), 1);
  }, [sorted]);

  return (
    <div className="px-3 py-2">
      <div className="space-y-0.5">
        {sorted.map((entry) => {
          const pct = (entry.cds5y / maxSpread) * 100;
          const barColor = getRatingBarColor(entry.rating);
          const isIg = IG_RATINGS.has(entry.rating);

          return (
            <div key={entry.ticker} className="flex items-center gap-2 hover:bg-pink-400/[0.02] px-1 py-0.5 transition-colors">
              {/* Entity info */}
              <div className="w-28 flex items-center gap-1 shrink-0">
                <span className="text-[9px] font-mono font-bold text-white">{entry.ticker}</span>
                <span className={`text-[7px] font-mono ${getRatingColor(entry.rating)}`}>
                  {entry.rating}
                </span>
              </div>

              {/* Bar */}
              <div className="flex-1 h-3.5 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: isIg ? 0.35 : 0.5,
                  }}
                />
                <div
                  className="absolute top-0 left-0 h-full border-r"
                  style={{
                    width: `${pct}%`,
                    borderColor: barColor,
                  }}
                />
              </div>

              {/* Spread value + change arrow */}
              <div className="w-16 flex items-center justify-end gap-1 shrink-0">
                <span className={`text-[9px] font-mono font-bold ${getCdsColor(entry.cds5y)}`}>
                  {entry.cds5y.toFixed(1)}
                </span>
                <span className={`text-[8px] font-mono ${getChangeColor(entry.change1d)}`}>
                  {entry.change1d > 0 ? '\u25B2' : entry.change1d < 0 ? '\u25BC' : '\u25CF'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 pt-2 border-t border-border/10 flex items-center gap-3 flex-wrap">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Rating scale:</span>
        {[
          { label: 'AAA-AA', color: '#34d399' },
          { label: 'A', color: '#60a5fa' },
          { label: 'BBB', color: '#fbbf24' },
          { label: 'BB', color: '#fb923c' },
          { label: 'B-', color: '#f87171' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2" style={{ backgroundColor: color, opacity: 0.5 }} />
            <span className="text-[7px] font-mono text-neutral-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
