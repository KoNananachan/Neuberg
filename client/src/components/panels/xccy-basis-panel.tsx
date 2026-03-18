import { useState, useMemo, useCallback } from 'react';
import {
  useXccyBasis,
  type XccyBasisData,
  type XccyBasisEntry,
} from '../../api/hooks/use-xccy-basis';
import { useT } from '../../i18n';
import { GitCompare, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const TENORS = ['3M', '6M', '1Y', '2Y', '3Y', '5Y', '10Y'] as const;
type Tenor = (typeof TENORS)[number];
type ViewMode = 'TABLE' | 'TERM STRUCTURE';

const PAIR_COLORS: Record<string, string> = {
  'EUR/USD': '#d946ef', // fuchsia (primary)
  'JPY/USD': '#38bdf8',
  'GBP/USD': '#4ade80',
  'CHF/USD': '#fb923c',
  'AUD/USD': '#a78bfa',
  'CAD/USD': '#f87171',
  'SEK/USD': '#facc15',
  'NOK/USD': '#2dd4bf',
  'NZD/USD': '#e879f9',
  'KRW/USD': '#60a5fa',
  'MXN/USD': '#34d399',
  'BRL/USD': '#fbbf24',
};

// ── Formatting helpers ──

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtSpot(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 1) return n.toFixed(4);
  if (n >= 0.01) return n.toFixed(4);
  return n.toFixed(5);
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Color helpers ──

function basisColor(bps: number): string {
  if (bps < -40) return 'text-red-400';
  if (bps < -20) return 'text-red-300';
  if (bps < -10) return 'text-orange-400';
  if (bps < 0) return 'text-yellow-400';
  return 'text-green-400';
}

function changeColor(n: number): string {
  if (n > 0.5) return 'text-green-400';
  if (n < -0.5) return 'text-red-400';
  return 'text-neutral-500';
}

function rowStressBg(bps: number): string {
  if (bps < -50) return 'bg-red-500/[0.06]';
  if (bps < -30) return 'bg-red-500/[0.03]';
  if (bps < -15) return 'bg-red-500/[0.01]';
  return '';
}

function signalStyle(signal: string | null): { text: string; label: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'DOLLAR_STRESS':
      return { text: 'text-red-400', label: 'STRESS' };
    case 'DOLLAR_SURPLUS':
      return { text: 'text-green-400', label: 'SURPLUS' };
    case 'WIDENING':
      return { text: 'text-red-300', label: 'WIDE' };
    case 'TIGHTENING':
      return { text: 'text-green-300', label: 'TIGHT' };
    default:
      return null;
  }
}

function stressColor(index: number): string {
  if (index >= 60) return 'text-red-400 bg-red-500/10 border border-red-500/30';
  if (index >= 35) return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  return 'text-green-400 bg-green-500/10 border border-green-500/30';
}

// ── Sort helpers ──

type SortKey = 'pair' | 'spotRate' | 'basisSpread' | 'change1d' | 'change1w' | 'change1m' | 'forwardPoints' | 'impliedYield' | 'percentile';

function getSortValue(entry: XccyBasisEntry, key: SortKey): number | string {
  switch (key) {
    case 'pair': return entry.pair;
    case 'spotRate': return entry.spotRate;
    case 'basisSpread': return entry.basisSpread;
    case 'change1d': return entry.change1d;
    case 'change1w': return entry.change1w;
    case 'change1m': return entry.change1m;
    case 'forwardPoints': return entry.forwardPoints;
    case 'impliedYield': return entry.impliedYield;
    case 'percentile': return entry.percentile;
    default: return 0;
  }
}

// ── Main Panel ──

export function XccyBasisPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useXccyBasis();
  const [selectedTenor, setSelectedTenor] = useState<Tenor>('3M');
  const [viewMode, setViewMode] = useState<ViewMode>('TABLE');
  const [sortKey, setSortKey] = useState<SortKey>('basisSpread');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'pair');
    }
  }, [sortKey]);

  const filteredEntries = useMemo(() => {
    if (!data) return [];
    const entries = data.entries.filter((e) => e.tenor === selectedTenor);
    return entries.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      const diff = (aVal as number) - (bVal as number);
      return sortAsc ? diff : -diff;
    });
  }, [data, selectedTenor, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-3 h-3 text-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'xccyTitle', 'XCCY BASIS')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <StressIndexBadge stressIndex={data.stressIndex} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tenor selector + View toggle */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-px">
          {TENORS.map((tenor) => (
            <button
              key={tenor}
              onClick={() => setSelectedTenor(tenor)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                selectedTenor === tenor
                  ? 'text-fuchsia-400 bg-fuchsia-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tenor}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-px">
          {(['TABLE', 'TERM STRUCTURE'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                viewMode === mode
                  ? 'text-fuchsia-400 bg-fuchsia-500/10'
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
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'xccyNoData', 'No data available')}
          </div>
        )}

        {data && viewMode === 'TABLE' && (
          <TableView
            entries={filteredEntries}
            sortKey={sortKey}
            sortAsc={sortAsc}
            onSort={handleSort}
            t={t}
          />
        )}

        {data && viewMode === 'TERM STRUCTURE' && (
          <TermStructureView data={data} t={t} />
        )}

        {/* Timestamp */}
        {data && (
          <div className="px-3 py-1 border-t border-border/10">
            <span className="text-[7px] font-mono text-neutral-700">
              {tr(t, 'xccyLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stress Index Badge ──

function StressIndexBadge({
  stressIndex,
  t,
}: {
  stressIndex: number;
  t: ReturnType<typeof useT>;
}) {
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${stressColor(stressIndex)}`}>
      {tr(t, 'xccyStress', 'USD Stress')}: {stressIndex}
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
  entries: XccyBasisEntry[];
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
              { key: 'pair' as SortKey, label: tr(t, 'xccyPair', 'Pair') },
              { key: 'spotRate' as SortKey, label: tr(t, 'xccySpot', 'Spot') },
              { key: 'basisSpread' as SortKey, label: tr(t, 'xccyBasis', 'Basis (bps)') },
              { key: 'change1d' as SortKey, label: '\u03941D' },
              { key: 'change1w' as SortKey, label: '\u03941W' },
              { key: 'change1m' as SortKey, label: '\u03941M' },
              { key: 'percentile' as SortKey, label: tr(t, 'xccy52wRange', '52W Range') },
              { key: 'forwardPoints' as SortKey, label: tr(t, 'xccyFwdPts', 'Fwd Pts') },
              { key: 'impliedYield' as SortKey, label: tr(t, 'xccyImplYld', 'Impl Yld') },
            ].map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left cursor-pointer hover:text-fuchsia-400 whitespace-nowrap select-none"
              >
                {col.label}{sortArrow(col.key)}
              </th>
            ))}
            <th className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left whitespace-nowrap">
              {tr(t, 'xccySignal', 'Signal')}
            </th>
            <th className="px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-left whitespace-nowrap">
              {tr(t, 'xccySpark', 'Trend')}
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

function TableRow({ entry }: { entry: XccyBasisEntry }) {
  const sig = signalStyle(entry.signal);

  return (
    <tr className={`border-b border-border/10 hover:bg-fuchsia-400/[0.02] ${rowStressBg(entry.basisSpread)}`}>
      {/* Pair */}
      <td className="px-2 py-1">
        <div className="flex items-center gap-1">
          <div
            className="w-1 h-1"
            style={{ backgroundColor: PAIR_COLORS[entry.pair] || '#d946ef' }}
          />
          <span className="text-[9px] font-mono font-bold text-white">{entry.pair}</span>
        </div>
      </td>

      {/* Spot */}
      <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">
        {fmtSpot(entry.spotRate)}
      </td>

      {/* Basis */}
      <td className="px-2 py-1">
        <span className={`text-[9px] font-mono font-bold ${basisColor(entry.basisSpread)}`}>
          {fmtBps(entry.basisSpread)}
        </span>
      </td>

      {/* Changes */}
      <td className={`px-2 py-1 text-[9px] font-mono ${changeColor(entry.change1d)}`}>
        {fmtChange(entry.change1d)}
      </td>
      <td className={`px-2 py-1 text-[9px] font-mono ${changeColor(entry.change1w)}`}>
        {fmtChange(entry.change1w)}
      </td>
      <td className={`px-2 py-1 text-[9px] font-mono ${changeColor(entry.change1m)}`}>
        {fmtChange(entry.change1m)}
      </td>

      {/* 52W Range bar */}
      <td className="px-2 py-1">
        <RangeBar
          low={entry.low52w}
          high={entry.high52w}
          current={entry.basisSpread}
          percentile={entry.percentile}
        />
      </td>

      {/* Forward Points */}
      <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">
        {entry.forwardPoints.toFixed(1)}
      </td>

      {/* Implied Yield */}
      <td className="px-2 py-1 text-[9px] font-mono text-neutral-300">
        {fmtPct(entry.impliedYield)}
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
      <span className="text-[7px] font-mono text-neutral-600 w-8 text-right">{low.toFixed(0)}</span>
      <div className="flex-1 h-1 bg-neutral-800 relative">
        <div
          className="absolute top-0 left-0 h-full bg-fuchsia-500/30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-[-1px] w-0.5 h-[6px] bg-fuchsia-400"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-600 w-8">{high.toFixed(0)}</span>
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

  const color = PAIR_COLORS[pair] || '#d946ef';

  return (
    <svg width={W} height={H} className="block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
    </svg>
  );
}

// ── Term Structure View ──

function TermStructureView({
  data,
  t,
}: {
  data: XccyBasisData;
  t: ReturnType<typeof useT>;
}) {
  const [hoveredPair, setHoveredPair] = useState<string | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; pair: string; tenor: string; spread: number } | null>(null);

  // Group entries by pair, ordered by tenor
  const pairData = useMemo(() => {
    const map = new Map<string, { tenor: string; spread: number }[]>();
    for (const entry of data.entries) {
      if (!map.has(entry.pair)) map.set(entry.pair, []);
      map.get(entry.pair)!.push({ tenor: entry.tenor, spread: entry.basisSpread });
    }
    // Ensure tenors are in order
    for (const [, vals] of map) {
      vals.sort((a, b) => TENORS.indexOf(a.tenor as Tenor) - TENORS.indexOf(b.tenor as Tenor));
    }
    return map;
  }, [data.entries]);

  const allSpreads = data.entries.map((e) => e.basisSpread);
  const minSpread = Math.min(...allSpreads, 0);
  const maxSpread = Math.max(...allSpreads, 0);
  const spreadRange = maxSpread - minSpread || 1;

  const W = 500;
  const H = 260;
  const PAD_L = 45;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const scaleX = (idx: number) => PAD_L + (idx / (TENORS.length - 1)) * chartW;
  const scaleY = (spread: number) => PAD_T + ((maxSpread - spread) / spreadRange) * chartH;

  // Zero line Y
  const zeroY = scaleY(0);

  // Major pairs to show (top 6 by absolute basis at 3M)
  const majorPairs = useMemo(() => {
    const pairs3M = data.entries
      .filter((e) => e.tenor === '3M')
      .sort((a, b) => Math.abs(b.basisSpread) - Math.abs(a.basisSpread));
    return pairs3M.map((e) => e.pair);
  }, [data.entries]);

  return (
    <div className="px-3 py-2">
      <div className="mb-2">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'xccyTermStructure', 'Basis Spread Term Structure (All Pairs)')}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxHeight: 280 }}
        onMouseLeave={() => { setHoveredPair(null); setHoverInfo(null); }}
      >
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const spread = minSpread + (spreadRange / 4) * i;
          const y = scaleY(spread);
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
                {spread.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {zeroY >= PAD_T && zeroY <= PAD_T + chartH && (
          <line
            x1={PAD_L}
            y1={zeroY}
            x2={W - PAD_R}
            y2={zeroY}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1}
          />
        )}

        {/* Tenor labels */}
        {TENORS.map((tenor, i) => (
          <text
            key={tenor}
            x={scaleX(i)}
            y={H - 5}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={8}
            fontFamily="monospace"
          >
            {tenor}
          </text>
        ))}

        {/* Pair lines */}
        {majorPairs.map((pair) => {
          const vals = pairData.get(pair);
          if (!vals) return null;

          const isEur = pair === 'EUR/USD';
          const isHovered = hoveredPair === pair;
          const isOtherHovered = hoveredPair !== null && !isHovered;
          const color = PAIR_COLORS[pair] || '#d946ef';

          const pathD = vals
            .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v.spread).toFixed(1)}`)
            .join(' ');

          const opacity = isOtherHovered ? 0.15 : isEur ? 1 : isHovered ? 1 : 0.35;
          const strokeWidth = isEur ? 2 : isHovered ? 1.8 : 1;

          return (
            <g
              key={pair}
              onMouseEnter={() => setHoveredPair(pair)}
            >
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                opacity={opacity}
              />
              {/* Invisible wider hit area */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={8}
              />
              {/* Data point circles */}
              {(isEur || isHovered) && vals.map((v, i) => (
                <circle
                  key={i}
                  cx={scaleX(i)}
                  cy={scaleY(v.spread)}
                  r={isEur ? 2.5 : 2}
                  fill={color}
                  opacity={opacity}
                  onMouseEnter={(e) => {
                    const svg = (e.target as SVGElement).closest('svg');
                    if (svg) {
                      setHoverInfo({
                        x: scaleX(i),
                        y: scaleY(v.spread),
                        pair,
                        tenor: v.tenor,
                        spread: v.spread,
                      });
                    }
                  }}
                  onMouseLeave={() => setHoverInfo(null)}
                />
              ))}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoverInfo && (
          <g>
            <rect
              x={hoverInfo.x + 6}
              y={hoverInfo.y - 18}
              width={85}
              height={22}
              fill="rgba(0,0,0,0.9)"
              stroke="rgba(217,70,239,0.3)"
              strokeWidth={0.5}
            />
            <text
              x={hoverInfo.x + 10}
              y={hoverInfo.y - 6}
              fill="white"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {hoverInfo.pair} {hoverInfo.tenor}: {fmtBps(hoverInfo.spread)} bps
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
        {majorPairs.map((pair) => {
          const color = PAIR_COLORS[pair] || '#d946ef';
          const isEur = pair === 'EUR/USD';
          return (
            <button
              key={pair}
              className={`flex items-center gap-1 text-[7px] font-mono transition-colors ${
                hoveredPair === pair || hoveredPair === null
                  ? 'text-neutral-400'
                  : 'text-neutral-700'
              } ${isEur ? 'font-bold' : ''}`}
              onMouseEnter={() => setHoveredPair(pair)}
              onMouseLeave={() => setHoveredPair(null)}
            >
              <div className="w-2 h-0.5" style={{ backgroundColor: color }} />
              {pair}
            </button>
          );
        })}
      </div>
    </div>
  );
}
