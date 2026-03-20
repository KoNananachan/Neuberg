import { useState, useMemo, useCallback } from 'react';
import {
  useSovereignSpreads,
  type SovereignSpreadsData,
  type SovereignSpread,
} from '../../api/hooks/use-sovereign-spreads';
import { useT, tr, TFn } from '../../i18n';
import { ArrowUpDown, RefreshCw } from 'lucide-react';

// ── Constants ──

type ViewMode = 'TABLE' | 'CHART' | 'TERM';
type CategoryFilter = 'ALL' | 'eurozone_peripheral' | 'eurozone_core' | 'cross_region';

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  ALL: 'ALL',
  eurozone_peripheral: 'EUROZONE PERIPHERAL',
  eurozone_core: 'EUROZONE CORE',
  cross_region: 'CROSS-REGION',
};

const PAIR_COLORS: Record<string, string> = {
  'IT-DE': '#f87171', // red
  'ES-DE': '#fb923c', // orange
  'GR-DE': '#fbbf24', // yellow
  'PT-DE': '#a3e635', // lime
  'FR-DE': '#38bdf8', // sky
  'IE-DE': '#818cf8', // indigo
  'US-DE': '#f59e0b', // amber (primary)
  'US-JP': '#d946ef', // fuchsia
  'GB-DE': '#4ade80', // green
  'AU-US': '#2dd4bf', // teal
};

// ── Formatting helpers ──

function fmtBps(n: number): string {
  return n.toFixed(0);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtDeviation(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

// ── Color helpers ──

function spreadChangeColor(n: number): string {
  // Widening = red (spread increase), Tightening = green (spread decrease)
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function deviationColor(n: number): string {
  if (n > 10) return 'text-red-400';
  if (n > 0) return 'text-red-300';
  if (n < -10) return 'text-green-400';
  if (n < 0) return 'text-green-300';
  return 'text-neutral-500';
}

function percentileColor(pct: number): string {
  if (pct >= 80) return 'bg-red-500/40';
  if (pct >= 60) return 'bg-orange-500/30';
  if (pct >= 40) return 'bg-amber-500/20';
  if (pct >= 20) return 'bg-green-500/20';
  return 'bg-green-500/30';
}

function signalStyle(signal: string | null): { text: string; label: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'WIDENING_FAST':
      return { text: 'text-red-400', label: 'WIDENING' };
    case 'TIGHTENING':
      return { text: 'text-green-400', label: 'TIGHT' };
    case 'AT_EXTREMES':
      return { text: 'text-red-300', label: 'EXTREME' };
    case 'STRESS':
      return { text: 'text-red-500', label: 'STRESS' };
    default:
      return null;
  }
}

// ── Sort helpers ──

type SortKey = 'pair' | 'yieldA' | 'yieldB' | 'spread' | 'change1d' | 'change1w' | 'change1m' | 'change3m' | 'deviationFromAvg' | 'percentile';

function getSortValue(entry: SovereignSpread, key: SortKey): number | string {
  switch (key) {
    case 'pair': return entry.pair;
    case 'yieldA': return entry.yieldA;
    case 'yieldB': return entry.yieldB;
    case 'spread': return entry.spread;
    case 'change1d': return entry.change1d;
    case 'change1w': return entry.change1w;
    case 'change1m': return entry.change1m;
    case 'change3m': return entry.change3m;
    case 'deviationFromAvg': return entry.deviationFromAvg;
    case 'percentile': return entry.percentile;
    default: return 0;
  }
}

// ── Main Panel ──

export function SovereignSpreadsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSovereignSpreads();
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('spread');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedPair, setSelectedPair] = useState<string>('IT-DE');

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'pair');
    }
  }, [sortKey]);

  const filteredSpreads = useMemo(() => {
    if (!data) return [];
    const filtered = categoryFilter === 'ALL'
      ? data.spreads
      : data.spreads.filter((s) => s.category === categoryFilter);
    return [...filtered].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortAsc ? diff : -diff;
    });
  }, [data, categoryFilter, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3 h-3 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'sovTitle', 'SOVEREIGN SPREADS')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <PeripheralBadge index={data.peripheralIndex} change={data.peripheralChange} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-amber-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Category filter + View toggle */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-px">
          {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                categoryFilter === cat
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-px">
          {(['TABLE', 'CHART', 'TERM'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                viewMode === mode
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sovNoData', 'No data available')}
          </div>
        )}

        {data && viewMode === 'TABLE' && (
          <TableView
            entries={filteredSpreads}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
            t={t}
          />
        )}

        {data && viewMode === 'CHART' && (
          <ChartView
            data={data}
            filteredSpreads={filteredSpreads}
            t={t}
          />
        )}

        {data && viewMode === 'TERM' && (
          <TermView
            data={data}
            selectedPair={selectedPair}
            onSelectPair={setSelectedPair}
            t={t}
          />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'sovLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Peripheral Index Badge ──

function PeripheralBadge({
  index,
  change,
  t,
}: {
  index: number;
  change: number;
  t: ReturnType<typeof useT>;
}) {
  const isWidening = change > 0;
  const colorClass = isWidening
    ? 'text-red-400 bg-red-500/10 border border-red-500/30'
    : change < 0
      ? 'text-green-400 bg-green-500/10 border border-green-500/30'
      : 'text-amber-400 bg-amber-500/10 border border-amber-500/30';

  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${colorClass}`}>
      {tr(t, 'sovPeripheral', 'Periph')}: {index} {fmtChange(change)}
    </span>
  );
}

// ── Table View ──

function TableView({
  entries,
  sortKey,
  sortAsc,
  onSort,
  t,
}: {
  entries: SovereignSpread[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (key: SortKey) => void;
  t: ReturnType<typeof useT>;
}) {
  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortAsc ? ' \u25B2' : ' \u25BC';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border/20">
            {[
              { key: 'pair' as SortKey, label: tr(t, 'sovPair', 'Pair') },
              { key: 'yieldA' as SortKey, label: tr(t, 'sovYieldA', 'Yield A') },
              { key: 'yieldB' as SortKey, label: tr(t, 'sovYieldB', 'Yield B') },
              { key: 'spread' as SortKey, label: tr(t, 'sovSpread', 'Spread (bps)') },
              { key: 'change1d' as SortKey, label: '\u03941D' },
              { key: 'change1w' as SortKey, label: '\u03941W' },
              { key: 'change1m' as SortKey, label: '\u03941M' },
              { key: 'change3m' as SortKey, label: '\u03943M' },
              { key: 'percentile' as SortKey, label: tr(t, 'sov52wRange', '52W Range') },
              { key: 'deviationFromAvg' as SortKey, label: tr(t, 'sovVsAvg', 'vs Avg') },
            ].map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left cursor-pointer hover:text-amber-400 whitespace-nowrap select-none"
              >
                {col.label}{sortArrow(col.key)}
              </th>
            ))}
            <th className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left whitespace-nowrap">
              {tr(t, 'sovPercentile', '%ile')}
            </th>
            <th className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left whitespace-nowrap">
              {tr(t, 'sovSignal', 'Signal')}
            </th>
            <th className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left whitespace-nowrap">
              {tr(t, 'sovTrend', 'Trend')}
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <TableRow key={entry.pair} entry={entry} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableRow({ entry }: { entry: SovereignSpread }) {
  const sig = signalStyle(entry.signal);

  return (
    <tr className="border-b border-border/10 hover:bg-amber-400/[0.02]">
      {/* Pair */}
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <div
            className="w-1 h-1"
            style={{ backgroundColor: PAIR_COLORS[entry.pair] || '#f59e0b' }}
          />
          <span className="text-[9px] font-mono font-bold text-white">{entry.pair}</span>
          <span className="text-[7px] font-mono text-neutral-600 hidden xl:inline">{entry.name}</span>
        </div>
      </td>

      {/* Yield A */}
      <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">
        {fmtYield(entry.yieldA)}
      </td>

      {/* Yield B */}
      <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">
        {fmtYield(entry.yieldB)}
      </td>

      {/* Spread */}
      <td className="px-2 py-1">
        <span className="text-[9px] font-mono font-bold text-amber-400">
          {fmtBps(entry.spread)}
        </span>
      </td>

      {/* Changes */}
      <td className={`px-2 py-1 text-[9px] font-mono ${spreadChangeColor(entry.change1d)}`}>
        {fmtChange(entry.change1d)}
      </td>
      <td className={`px-2 py-1 text-[9px] font-mono ${spreadChangeColor(entry.change1w)}`}>
        {fmtChange(entry.change1w)}
      </td>
      <td className={`px-2 py-1 text-[9px] font-mono ${spreadChangeColor(entry.change1m)}`}>
        {fmtChange(entry.change1m)}
      </td>
      <td className={`px-2 py-1 text-[9px] font-mono ${spreadChangeColor(entry.change3m)}`}>
        {fmtChange(entry.change3m)}
      </td>

      {/* 52W Range bar */}
      <td className="px-2 py-1">
        <RangeBar
          low={entry.low52w}
          high={entry.high52w}
          current={entry.spread}
          percentile={entry.percentile}
        />
      </td>

      {/* vs Avg */}
      <td className={`px-2 py-1 text-[9px] font-mono ${deviationColor(entry.deviationFromAvg)}`}>
        {fmtDeviation(entry.deviationFromAvg)}
      </td>

      {/* Percentile */}
      <td className="px-2 py-1">
        <PercentileBar percentile={entry.percentile} />
      </td>

      {/* Signal */}
      <td className="px-2 py-1">
        {sig ? (
          <span className={`text-[7px] font-mono font-bold px-1 py-px ${sig.text}`}>
            {sig.label}
          </span>
        ) : (
          <span className="text-[7px] font-mono text-neutral-700">-</span>
        )}
      </td>

      {/* Sparkline */}
      <td className="px-2 py-1">
        <MiniSparkline values={entry.history} pair={entry.pair} />
      </td>
    </tr>
  );
}

// ── 52W Range Bar ──

function RangeBar({
  low,
  high,
  current,
  percentile,
}: {
  low: number;
  high: number;
  current: number;
  percentile: number;
}) {
  const pct = Math.max(0, Math.min(100, percentile));

  return (
    <div className="flex items-center gap-1 min-w-[80px]">
      <span className="text-[7px] font-mono text-neutral-600 w-6 text-right">{low}</span>
      <div className="flex-1 h-1 bg-neutral-800 relative">
        <div
          className="absolute top-0 left-0 h-full bg-amber-500/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-[-1px] w-0.5 h-[6px] bg-amber-400"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-600 w-6">{high}</span>
    </div>
  );
}

// ── Percentile Bar ──

function PercentileBar({ percentile }: { percentile: number }) {
  const pct = Math.max(0, Math.min(100, percentile));

  return (
    <div className="flex items-center gap-1 min-w-[40px]">
      <div className="flex-1 h-1.5 bg-neutral-800 relative">
        <div
          className={`absolute top-0 left-0 h-full ${percentileColor(pct)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-400 w-5 text-right">{pct}</span>
    </div>
  );
}

// ── Mini Sparkline ──

function MiniSparkline({ values, pair }: { values: number[]; pair: string }) {
  if (values.length < 2) return null;

  const W = 48;
  const H = 14;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const color = PAIR_COLORS[pair] || '#f59e0b';

  return (
    <svg width={W} height={H} className="block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
    </svg>
  );
}

// ── Chart View ──

function ChartView({
  data,
  filteredSpreads,
  t,
}: {
  data: SovereignSpreadsData;
  filteredSpreads: SovereignSpread[];
  t: ReturnType<typeof useT>;
}) {
  const [hoveredPair, setHoveredPair] = useState<string | null>(null);

  const W = 520;
  const H = 280;
  const PAD_L = 45;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Compute peripheral index history (average of peripheral histories)
  const peripheralHistory = useMemo(() => {
    const peripheral = data.spreads.filter((s) => s.category === 'eurozone_peripheral');
    if (peripheral.length === 0) return [];
    const len = Math.min(...peripheral.map((s) => s.history.length));
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      let sum = 0;
      let wSum = 0;
      for (const s of peripheral) {
        const w = s.pair === 'IT-DE' ? 0.35 : s.pair === 'ES-DE' ? 0.25 : s.pair === 'GR-DE' ? 0.20 : 0.20;
        sum += s.history[i] * w;
        wSum += w;
      }
      result.push(wSum > 0 ? sum / wSum : 0);
    }
    return result;
  }, [data.spreads]);

  // Get all history values for scaling
  const allValues = useMemo(() => {
    const vals: number[] = [];
    for (const s of filteredSpreads) {
      vals.push(...s.history);
    }
    vals.push(...peripheralHistory);
    return vals;
  }, [filteredSpreads, peripheralHistory]);

  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 100;
  const valRange = maxVal - minVal || 1;

  const scaleX = (idx: number, total: number) => PAD_L + (idx / Math.max(total - 1, 1)) * chartW;
  const scaleY = (val: number) => PAD_T + ((maxVal - val) / valRange) * chartH;

  // Primary pairs (thicker lines)
  const primaryPairs = new Set(['IT-DE', 'ES-DE']);

  return (
    <div className="px-3 py-2">
      <div className="mb-2">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovChartTitle', 'Sovereign Spread History (30 Points)')}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 300 }}
        onMouseLeave={() => setHoveredPair(null)}
      >
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const val = minVal + (valRange / 4) * i;
          const y = scaleY(val);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 4}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {[0, 9, 19, 29].map((idx) => (
          <text
            key={idx}
            x={scaleX(idx, 30)}
            y={H - 5}
            textAnchor="middle"
            fill="rgba(255,255,255,0.2)"
            fontSize={7}
            fontFamily="monospace"
          >
            {idx === 0 ? '-30' : idx === 29 ? 'Now' : `-${30 - idx}`}
          </text>
        ))}

        {/* Peripheral index shaded area */}
        {peripheralHistory.length > 1 && (
          <path
            d={
              peripheralHistory
                .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i, peripheralHistory.length).toFixed(1)},${scaleY(v).toFixed(1)}`)
                .join(' ') +
              ` L ${scaleX(peripheralHistory.length - 1, peripheralHistory.length).toFixed(1)},${scaleY(minVal).toFixed(1)}` +
              ` L ${scaleX(0, peripheralHistory.length).toFixed(1)},${scaleY(minVal).toFixed(1)} Z`
            }
            fill="rgba(245,158,11,0.06)"
          />
        )}

        {/* Spread lines */}
        {filteredSpreads.map((spread) => {
          const isPrimary = primaryPairs.has(spread.pair);
          const isHovered = hoveredPair === spread.pair;
          const isOtherHovered = hoveredPair !== null && !isHovered;
          const color = PAIR_COLORS[spread.pair] || '#f59e0b';

          const pathD = spread.history
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i, spread.history.length).toFixed(1)},${scaleY(v).toFixed(1)}`)
            .join(' ');

          const opacity = isOtherHovered ? 0.12 : isPrimary ? 0.9 : isHovered ? 1 : 0.35;
          const strokeWidth = isPrimary ? 2 : isHovered ? 1.8 : 1;

          return (
            <g key={spread.pair} onMouseEnter={() => setHoveredPair(spread.pair)}>
              <path d={pathD} fill="none" stroke={color} strokeWidth={strokeWidth} opacity={opacity} />
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={8} />
              {(isPrimary || isHovered) && (
                <circle
                  cx={scaleX(spread.history.length - 1, spread.history.length)}
                  cy={scaleY(spread.history[spread.history.length - 1])}
                  r={isPrimary ? 2.5 : 2}
                  fill={color}
                  opacity={opacity}
                />
              )}
              {isHovered && (
                <text
                  x={scaleX(spread.history.length - 1, spread.history.length) + 5}
                  y={scaleY(spread.history[spread.history.length - 1]) - 4}
                  fill={color}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {spread.pair} {spread.spread}bps
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
        {filteredSpreads.map((spread) => {
          const color = PAIR_COLORS[spread.pair] || '#f59e0b';
          const isPrimary = primaryPairs.has(spread.pair);
          return (
            <button
              key={spread.pair}
              className={`flex items-center gap-1 text-[7px] font-mono transition-colors ${
                hoveredPair === spread.pair || hoveredPair === null
                  ? 'text-neutral-400'
                  : 'text-neutral-700'
              } ${isPrimary ? 'font-bold' : ''}`}
              onMouseEnter={() => setHoveredPair(spread.pair)}
              onMouseLeave={() => setHoveredPair(null)}
            >
              <div className="w-2 h-0.5" style={{ backgroundColor: color }} />
              {spread.pair}
            </button>
          );
        })}
        <span className="flex items-center gap-1 text-[7px] font-mono text-neutral-600">
          <div className="w-2 h-2 bg-amber-500/20" />
          {tr(t, 'sovPeriphIdx', 'Peripheral Idx')}
        </span>
      </div>
    </div>
  );
}

// ── Term Structure View ──

function TermView({
  data,
  selectedPair,
  onSelectPair,
  t,
}: {
  data: SovereignSpreadsData;
  selectedPair: string;
  onSelectPair: (pair: string) => void;
  t: ReturnType<typeof useT>;
}) {
  const selected = data.spreads.find((s) => s.pair === selectedPair) || data.spreads[0];
  const tenorSpreads = selected?.tenorSpreads || [];

  const W = 400;
  const H = 200;
  const PAD_L = 45;
  const PAD_R = 20;
  const PAD_T = 15;
  const PAD_B = 30;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const values = tenorSpreads.map((t) => t.spread);
  const maxVal = values.length > 0 ? Math.max(...values) * 1.15 : 100;
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  const barWidth = tenorSpreads.length > 0 ? Math.min(40, chartW / tenorSpreads.length * 0.6) : 40;
  const barGap = tenorSpreads.length > 0 ? chartW / tenorSpreads.length : chartW;

  const scaleY = (val: number) => PAD_T + ((maxVal - val) / valRange) * chartH;
  const color = PAIR_COLORS[selected?.pair || 'IT-DE'] || '#f59e0b';

  return (
    <div className="px-3 py-2">
      {/* Pair selector */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sovTermTitle', 'Term Structure')}:
        </span>
        <div className="flex items-center gap-px flex-wrap">
          {data.spreads.map((s) => (
            <button
              key={s.pair}
              onClick={() => onSelectPair(s.pair)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                selectedPair === s.pair
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {s.pair}
            </button>
          ))}
        </div>
      </div>

      {/* Selected pair info */}
      {selected && (
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-mono font-bold text-white">{selected.name}</span>
          <span className="text-[9px] font-mono font-bold text-amber-400">{selected.spread} bps</span>
          <span className={`text-[8px] font-mono ${spreadChangeColor(selected.change1d)}`}>
            {fmtChange(selected.change1d)} 1D
          </span>
          <span className="text-[8px] font-mono text-neutral-500">
            Avg: {selected.avgSpread1y} bps
          </span>
        </div>
      )}

      {/* Bar chart with line */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const val = minVal + (valRange / 4) * i;
          const y = scaleY(val);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 4}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {tenorSpreads.map((ts, i) => {
          const cx = PAD_L + barGap * (i + 0.5);
          const barH = ((ts.spread - minVal) / valRange) * chartH;
          const barY = PAD_T + chartH - barH;

          return (
            <g key={ts.tenor}>
              <rect
                x={cx - barWidth / 2}
                y={barY}
                width={barWidth}
                height={barH}
                fill={color}
                opacity={0.25}
              />
              <rect
                x={cx - barWidth / 2}
                y={barY}
                width={barWidth}
                height={2}
                fill={color}
                opacity={0.8}
              />
              {/* Value label */}
              <text
                x={cx}
                y={barY - 4}
                textAnchor="middle"
                fill="white"
                fontSize={8}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {ts.spread}
              </text>
              {/* Tenor label */}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize={9}
                fontFamily="monospace"
              >
                {ts.tenor}
              </text>
            </g>
          );
        })}

        {/* Connecting line */}
        {tenorSpreads.length > 1 && (
          <path
            d={tenorSpreads
              .map((ts, i) => {
                const cx = PAD_L + barGap * (i + 0.5);
                const y = scaleY(ts.spread);
                return `${i === 0 ? 'M' : 'L'} ${cx.toFixed(1)},${y.toFixed(1)}`;
              })
              .join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={0.8}
          />
        )}

        {/* Data point circles on the line */}
        {tenorSpreads.map((ts, i) => {
          const cx = PAD_L + barGap * (i + 0.5);
          const y = scaleY(ts.spread);
          return (
            <circle key={ts.tenor} cx={cx} cy={y} r={3} fill={color} />
          );
        })}
      </svg>

      {/* Average comparison */}
      {selected && (
        <div className="mt-2 pt-1 border-t border-border/10">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">1Y Avg Spread</span>
              <span className="text-[9px] font-mono font-bold text-neutral-300 ml-1">
                {selected.avgSpread1y} bps
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">Deviation</span>
              <span className={`text-[9px] font-mono font-bold ml-1 ${deviationColor(selected.deviationFromAvg)}`}>
                {fmtDeviation(selected.deviationFromAvg)} bps
              </span>
            </div>
            <div>
              <span className="text-[7px] font-mono text-neutral-600 uppercase">52W Percentile</span>
              <span className="text-[9px] font-mono font-bold text-neutral-300 ml-1">
                {selected.percentile}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
