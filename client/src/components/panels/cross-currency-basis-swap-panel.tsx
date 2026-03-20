import { useState, useMemo } from 'react';
import { useCrossCurrencyBasisSwap } from '../../api/hooks/use-cross-currency-basis-swap';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, GitCompare } from 'lucide-react';

// ── Constants ──

type TabMode = 'SPREADS' | 'TERM STRUCTURE' | 'HISTORY' | 'FUNDING COST';

const TABS: { key: TabMode; label: string }[] = [
  { key: 'SPREADS', label: 'SPREADS' },
  { key: 'TERM STRUCTURE', label: 'TERM STRUCTURE' },
  { key: 'HISTORY', label: 'HISTORY' },
  { key: 'FUNDING COST', label: 'FUNDING COST' },
];

// ── Formatting helpers ──

function fmtBps(n: unknown): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: unknown): string {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '-';
  return `${n.toFixed(2)}%`;
}

function fmtDate(d: unknown): string {
  if (!d) return '-';
  try {
    return new Date(String(d)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
}

// ── Color helpers ──

// More negative = wider basis = more stress = red
// Closer to zero or positive = tighter = green
function basisColor(bps: number): string {
  if (bps < -50) return 'text-red-400';
  if (bps < -30) return 'text-red-300';
  if (bps < -15) return 'text-orange-400';
  if (bps < -5) return 'text-yellow-400';
  if (bps < 0) return 'text-yellow-300';
  return 'text-green-400';
}

function basisCellBg(bps: number): string {
  if (bps < -50) return 'bg-red-500/[0.10]';
  if (bps < -30) return 'bg-red-500/[0.06]';
  if (bps < -15) return 'bg-orange-500/[0.04]';
  return '';
}

function changeColor(n: number): string {
  // Positive change = tightening (green), negative = widening (red)
  if (n > 0.5) return 'text-green-400';
  if (n < -0.5) return 'text-red-400';
  return 'text-neutral-500';
}

function stressColor(level: string): string {
  const l = (level || '').toUpperCase();
  if (l === 'HIGH' || l === 'SEVERE' || l === 'CRITICAL') return 'text-red-400';
  if (l === 'ELEVATED') return 'text-orange-400';
  if (l === 'MODERATE') return 'text-yellow-400';
  return 'text-green-400';
}

function stressBadgeClass(level: string): string {
  const l = (level || '').toUpperCase();
  if (l === 'HIGH' || l === 'SEVERE' || l === 'CRITICAL')
    return 'text-red-400 bg-red-500/10 border border-red-500/30';
  if (l === 'ELEVATED')
    return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
  if (l === 'MODERATE')
    return 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30';
  return 'text-green-400 bg-green-500/10 border border-green-500/30';
}

// ── Skeleton shimmer ──

function Shimmer({ w = 'w-12', h = 'h-3' }: { w?: string; h?: string }) {
  return (
    <div className={`${w} ${h} bg-neutral-800 animate-pulse`} />
  );
}

function SkeletonRows({ rows = 8, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="px-3 py-2 space-y-2">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-3">
          {Array.from({ length: cols }, (_, c) => (
            <Shimmer key={c} w={c === 0 ? 'w-16' : 'w-10'} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function CrossCurrencyBasisSwapPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCrossCurrencyBasisSwap();
  const [tab, setTab] = useState<TabMode>('SPREADS');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <GitCompare className="w-3 h-3 text-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'xccyBasisSwapTitle', 'XCCY BASIS SWAP MONITOR')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.summary ? (
            <SummaryStressBadge summary={data.summary} />
          ) : null}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-3 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              tab === tb.key
                ? 'text-fuchsia-400 bg-fuchsia-400/[0.06] border-b border-fuchsia-400'
                : 'text-neutral-600 hover:text-neutral-400 border-b border-transparent'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !data ? (
          <div className="px-3 py-3">
            <div className="text-[9px] font-mono text-fuchsia-400 uppercase tracking-widest animate-pulse mb-3">
              {tr(t, 'loading', 'Loading...')}
            </div>
            <SkeletonRows />
          </div>
        ) : error && !data ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-[9px] font-mono text-red-400/70 uppercase tracking-wider">
              {tr(t, 'xccyBasisSwapError', 'Failed to load cross-currency basis swap data')}
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-fuchsia-400 border border-fuchsia-400/30 hover:bg-fuchsia-400/10 transition-colors"
            >
              {tr(t, 'retry', 'RETRY')}
            </button>
          </div>
        ) : data ? (
          <>
            {/* Summary row */}
            <SummaryBar summary={data.summary} t={t} />

            {/* Tab content */}
            {tab === 'SPREADS' && <SpreadsSection spreads={data.spreads} t={t} />}
            {tab === 'TERM STRUCTURE' && <TermStructureSection termStructure={data.termStructure} t={t} />}
            {tab === 'HISTORY' && <HistorySection history={data.history} t={t} />}
            {tab === 'FUNDING COST' && <FundingCostSection fundingCost={data.fundingCost} t={t} />}
          </>
        ) : (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'xccyBasisSwapNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Stress Badge (header) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryStressBadge({ summary }: { summary: any }) {
  const level = String(summary?.stressLevel || summary?.fundingStress || 'LOW');
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${stressBadgeClass(level)}`}>
      {level}
    </span>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ summary, t }: { summary: any; t: TFn }) {
  if (!summary) return null;

  const items: { label: string; value: string; color: string }[] = [
    {
      label: tr(t, 'xccyBsAvgBasis', 'AVG BASIS'),
      value: summary.avgBasis != null ? `${fmtBps(summary.avgBasis)} bp` : '-',
      color: summary.avgBasis != null ? basisColor(summary.avgBasis) : 'text-neutral-500',
    },
    {
      label: tr(t, 'xccyBsWidest', 'WIDEST'),
      value: summary.widestPair
        ? `${String(summary.widestPair)} ${fmtBps(summary.widestBasis)}`
        : '-',
      color: summary.widestBasis != null ? 'text-red-400' : 'text-neutral-500',
    },
    {
      label: tr(t, 'xccyBsTightest', 'TIGHTEST'),
      value: summary.tightestPair
        ? `${String(summary.tightestPair)} ${fmtBps(summary.tightestBasis)}`
        : '-',
      color: summary.tightestBasis != null ? 'text-green-400' : 'text-neutral-500',
    },
    {
      label: tr(t, 'xccyBsTrend', 'TREND'),
      value: summary.trend ? String(summary.trend) : '-',
      color: String(summary.trend || '').toUpperCase() === 'WIDENING'
        ? 'text-red-400'
        : String(summary.trend || '').toUpperCase() === 'TIGHTENING'
          ? 'text-green-400'
          : 'text-neutral-400',
    },
    {
      label: tr(t, 'xccyBsStress', 'STRESS'),
      value: summary.stressLevel ? String(summary.stressLevel) : '-',
      color: stressColor(String(summary.stressLevel || '')),
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 px-3 py-1.5 shrink-0 bg-[#050505]">
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{item.label}</div>
          <div className={`text-[10px] font-mono font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── SPREADS Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsSection({ spreads, t }: { spreads: any; t: TFn }) {
  const rows = Array.isArray(spreads) ? spreads : [];

  if (rows.length === 0) {
    return (
      <EmptyState label={tr(t, 'xccyBsNoSpreads', 'No spread data available')} />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <TH align="left">{tr(t, 'xccyBsPair', 'PAIR')}</TH>
            <TH>{tr(t, 'xccyBsTenor', 'TENOR')}</TH>
            <TH>{tr(t, 'xccyBsBasis', 'BASIS (BPS)')}</TH>
            <TH>{'\u03941D'}</TH>
            <TH>{'\u03941W'}</TH>
            <TH>{'\u03941M'}</TH>
            <TH>{tr(t, 'xccyBsSpot', 'SPOT')}</TH>
            <TH>{tr(t, 'xccyBsImpliedRate', 'IMPL RATE')}</TH>
            <TH>{tr(t, 'xccyBsSignal', 'SIGNAL')}</TH>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((row: any, i: number) => {
            const basis = typeof row.basis === 'number' ? row.basis : 0;
            return (
              <tr
                key={`${String(row.pair)}-${String(row.tenor)}-${i}`}
                className={`border-b border-border/10 hover:bg-fuchsia-400/[0.02] ${basisCellBg(basis)}`}
              >
                <td className="px-2 py-1">
                  <span className="text-[9px] font-mono font-bold text-fuchsia-400">
                    {String(row.pair || '-')}
                  </span>
                </td>
                <td className="px-2 py-1 text-right">
                  <span className="text-[9px] font-mono text-neutral-400">
                    {String(row.tenor || '-')}
                  </span>
                </td>
                <td className="px-2 py-1 text-right">
                  <span className={`text-[9px] font-mono font-bold ${basisColor(basis)}`}>
                    {fmtBps(row.basis)}
                  </span>
                </td>
                <td className={`px-2 py-1 text-right text-[9px] font-mono ${changeColor(row.change1d ?? 0)}`}>
                  {fmtBps(row.change1d)}
                </td>
                <td className={`px-2 py-1 text-right text-[9px] font-mono ${changeColor(row.change1w ?? 0)}`}>
                  {fmtBps(row.change1w)}
                </td>
                <td className={`px-2 py-1 text-right text-[9px] font-mono ${changeColor(row.change1m ?? 0)}`}>
                  {fmtBps(row.change1m)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-300">
                  {row.spotRate != null ? String(typeof row.spotRate === 'number' ? row.spotRate.toFixed(4) : row.spotRate) : '-'}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-300">
                  {fmtPct(row.impliedRate)}
                </td>
                <td className="px-2 py-1 text-right">
                  {row.signal ? (
                    <SignalBadge signal={String(row.signal)} />
                  ) : (
                    <span className="text-[7px] font-mono text-neutral-700">-</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── TERM STRUCTURE Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TermStructureSection({ termStructure, t }: { termStructure: any; t: TFn }) {
  const items = Array.isArray(termStructure) ? termStructure : [];
  const [selectedPair, setSelectedPair] = useState<string | null>(null);

  // Group by pair
  const pairMap = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map<string, { tenor: string; basis: number }[]>();
    for (const item of items) {
      const pair = String(item.pair || '');
      if (!pair) continue;
      if (!map.has(pair)) map.set(pair, []);
      map.get(pair)!.push({
        tenor: String(item.tenor || ''),
        basis: typeof item.basis === 'number' ? item.basis : 0,
      });
    }
    return map;
  }, [items]);

  const allPairs = useMemo(() => Array.from(pairMap.keys()), [pairMap]);
  const activePair = selectedPair && pairMap.has(selectedPair) ? selectedPair : (allPairs[0] || null);

  if (items.length === 0) {
    return <EmptyState label={tr(t, 'xccyBsNoTermStructure', 'No term structure data available')} />;
  }

  // Compute chart scales
  const allBasis = items.map((i: { basis?: number }) => (typeof i.basis === 'number' ? i.basis : 0));
  const minBasis = Math.min(...allBasis, 0);
  const maxBasis = Math.max(...allBasis, 0);
  const basisRange = maxBasis - minBasis || 1;

  // Get tenors from data
  const tenors = useMemo(() => {
    const s = new Set<string>();
    for (const item of items) s.add(String(item.tenor || ''));
    return Array.from(s);
  }, [items]);

  const W = 500;
  const H = 240;
  const PAD_L = 45;
  const PAD_R = 15;
  const PAD_T = 15;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const scaleX = (idx: number) => PAD_L + (tenors.length > 1 ? (idx / (tenors.length - 1)) * chartW : chartW / 2);
  const scaleY = (spread: number) => PAD_T + ((maxBasis - spread) / basisRange) * chartH;

  const zeroY = scaleY(0);

  const PAIR_COLORS: Record<string, string> = {
    'EUR/USD': '#d946ef',
    'JPY/USD': '#38bdf8',
    'GBP/USD': '#4ade80',
    'CHF/USD': '#fb923c',
    'AUD/USD': '#a78bfa',
    'CAD/USD': '#f87171',
    'SEK/USD': '#facc15',
    'NOK/USD': '#2dd4bf',
    'NZD/USD': '#e879f9',
    'KRW/USD': '#60a5fa',
  };

  return (
    <div className="px-3 py-2">
      {/* Pair selector */}
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {allPairs.map((pair) => (
          <button
            key={pair}
            onClick={() => setSelectedPair(pair)}
            className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activePair === pair
                ? 'text-fuchsia-400 bg-fuchsia-400/10'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {pair}
          </button>
        ))}
      </div>

      {/* SVG chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
        {/* Grid lines */}
        {Array.from({ length: 5 }, (_, i) => {
          const spread = minBasis + (basisRange / 4) * i;
          const y = scaleY(spread);
          return (
            <g key={i}>
              <line
                x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
              />
              <text
                x={PAD_L - 4} y={y + 3} textAnchor="end"
                fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
              >
                {spread.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Zero line */}
        {zeroY >= PAD_T && zeroY <= PAD_T + chartH ? (
          <line
            x1={PAD_L} y1={zeroY} x2={W - PAD_R} y2={zeroY}
            stroke="rgba(255,255,255,0.12)" strokeWidth={1}
          />
        ) : null}

        {/* Tenor labels */}
        {tenors.map((tenor, i) => (
          <text
            key={tenor}
            x={scaleX(i)} y={H - 5} textAnchor="middle"
            fill="rgba(255,255,255,0.3)" fontSize={8} fontFamily="monospace"
          >
            {tenor}
          </text>
        ))}

        {/* Background lines for non-selected pairs */}
        {allPairs
          .filter((p) => p !== activePair)
          .map((pair) => {
            const vals = pairMap.get(pair);
            if (!vals || vals.length < 2) return null;
            const pathD = vals
              .map((v, i) => {
                const tIdx = tenors.indexOf(v.tenor);
                const xi = tIdx >= 0 ? tIdx : i;
                return `${i === 0 ? 'M' : 'L'} ${scaleX(xi).toFixed(1)},${scaleY(v.basis).toFixed(1)}`;
              })
              .join(' ');
            return (
              <path
                key={pair}
                d={pathD}
                fill="none"
                stroke={PAIR_COLORS[pair] || '#d946ef'}
                strokeWidth={0.8}
                opacity={0.15}
              />
            );
          })}

        {/* Active pair line */}
        {activePair && (() => {
          const vals = pairMap.get(activePair);
          if (!vals || vals.length < 2) return null;
          const color = PAIR_COLORS[activePair] || '#d946ef';
          const pathD = vals
            .map((v, i) => {
              const tIdx = tenors.indexOf(v.tenor);
              const xi = tIdx >= 0 ? tIdx : i;
              return `${i === 0 ? 'M' : 'L'} ${scaleX(xi).toFixed(1)},${scaleY(v.basis).toFixed(1)}`;
            })
            .join(' ');
          return (
            <g>
              <path d={pathD} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
              {vals.map((v, i) => {
                const tIdx = tenors.indexOf(v.tenor);
                const xi = tIdx >= 0 ? tIdx : i;
                return (
                  <g key={i}>
                    <circle cx={scaleX(xi)} cy={scaleY(v.basis)} r={2.5} fill={color} />
                    <text
                      x={scaleX(xi)} y={scaleY(v.basis) - 6}
                      textAnchor="middle" fill={color} fontSize={6} fontFamily="monospace" fontWeight="bold"
                    >
                      {v.basis.toFixed(1)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
        {allPairs.map((pair) => {
          const color = PAIR_COLORS[pair] || '#d946ef';
          const isActive = pair === activePair;
          return (
            <button
              key={pair}
              onClick={() => setSelectedPair(pair)}
              className={`flex items-center gap-1 text-[7px] font-mono transition-colors ${
                isActive ? 'text-neutral-300 font-bold' : 'text-neutral-600'
              }`}
            >
              <div className="w-2 h-0.5" style={{ backgroundColor: color, opacity: isActive ? 1 : 0.4 }} />
              {pair}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── HISTORY Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistorySection({ history, t }: { history: any; t: TFn }) {
  const rows = Array.isArray(history) ? history : [];

  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'xccyBsNoHistory', 'No historical data available')} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <TH align="left">{tr(t, 'xccyBsPair', 'PAIR')}</TH>
            <TH>{tr(t, 'xccyBsCurrent', 'CURRENT')}</TH>
            <TH>{tr(t, 'xccyBs3mAvg', '3M AVG')}</TH>
            <TH>{tr(t, 'xccyBs6mAvg', '6M AVG')}</TH>
            <TH>{tr(t, 'xccyBs1yAvg', '1Y AVG')}</TH>
            <TH>{tr(t, 'xccyBs52wLow', '52W LOW')}</TH>
            <TH>{tr(t, 'xccyBs52wHigh', '52W HIGH')}</TH>
            <TH>{tr(t, 'xccyBsPercentile', 'PERCENTILE')}</TH>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((row: any, i: number) => {
            const current = typeof row.current === 'number' ? row.current : 0;
            const pct = typeof row.percentile === 'number' ? Math.max(0, Math.min(100, row.percentile)) : 0;
            return (
              <tr
                key={`${String(row.pair)}-${i}`}
                className="border-b border-border/10 hover:bg-fuchsia-400/[0.02]"
              >
                <td className="px-2 py-1">
                  <span className="text-[9px] font-mono font-bold text-fuchsia-400">
                    {String(row.pair || '-')}
                  </span>
                </td>
                <td className={`px-2 py-1 text-right text-[9px] font-mono font-bold ${basisColor(current)}`}>
                  {fmtBps(row.current)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-400">
                  {fmtBps(row.avg3m)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-400">
                  {fmtBps(row.avg6m)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-400">
                  {fmtBps(row.avg1y)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-red-400/70">
                  {fmtBps(row.low52w)}
                </td>
                <td className="px-2 py-1 text-right text-[9px] font-mono text-green-400/70">
                  {fmtBps(row.high52w)}
                </td>
                <td className="px-2 py-1">
                  <PercentileBar percentile={pct} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── FUNDING COST Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FundingCostSection({ fundingCost, t }: { fundingCost: any; t: TFn }) {
  const rows = Array.isArray(fundingCost) ? fundingCost : [];

  if (rows.length === 0) {
    return <EmptyState label={tr(t, 'xccyBsNoFunding', 'No funding cost data available')} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 bg-black/95">
          <tr className="border-b border-border/20">
            <TH align="left">{tr(t, 'xccyBsCurrency', 'CURRENCY')}</TH>
            <TH>{tr(t, 'xccyBsOvernightRate', 'ON RATE')}</TH>
            <TH>{tr(t, 'xccyBs3mRate', '3M RATE')}</TH>
            <TH>{tr(t, 'xccyBsBasisCost', 'BASIS COST')}</TH>
            <TH>{tr(t, 'xccyBsAllInCost', 'ALL-IN COST')}</TH>
            <TH>{'\u03941D'}</TH>
            <TH>{tr(t, 'xccyBsStressLvl', 'STRESS')}</TH>
            <TH>{tr(t, 'xccyBsLastUpdate', 'UPDATED')}</TH>
          </tr>
        </thead>
        <tbody>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((row: any, i: number) => (
            <tr
              key={`${String(row.currency)}-${i}`}
              className="border-b border-border/10 hover:bg-fuchsia-400/[0.02]"
            >
              <td className="px-2 py-1">
                <span className="text-[9px] font-mono font-bold text-fuchsia-400">
                  {String(row.currency || row.pair || '-')}
                </span>
              </td>
              <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-300">
                {fmtPct(row.overnightRate)}
              </td>
              <td className="px-2 py-1 text-right text-[9px] font-mono text-neutral-300">
                {fmtPct(row.rate3m)}
              </td>
              <td className={`px-2 py-1 text-right text-[9px] font-mono font-bold ${basisColor(typeof row.basisCost === 'number' ? row.basisCost : 0)}`}>
                {fmtBps(row.basisCost)}
                <span className="text-[7px] text-neutral-600 ml-0.5">bp</span>
              </td>
              <td className="px-2 py-1 text-right text-[9px] font-mono text-white font-bold">
                {fmtPct(row.allInCost)}
              </td>
              <td className={`px-2 py-1 text-right text-[9px] font-mono ${changeColor(row.change1d ?? 0)}`}>
                {fmtBps(row.change1d)}
              </td>
              <td className="px-2 py-1 text-right">
                {row.stressLevel ? (
                  <span className={`text-[7px] font-mono font-bold px-1 py-px uppercase ${stressBadgeClass(String(row.stressLevel))}`}>
                    {String(row.stressLevel)}
                  </span>
                ) : (
                  <span className="text-[7px] font-mono text-neutral-700">-</span>
                )}
              </td>
              <td className="px-2 py-1 text-right text-[8px] font-mono text-neutral-600">
                {fmtDate(row.lastUpdate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared sub-components ──

function TH({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th className={`px-2 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
      align === 'left' ? 'text-left' : 'text-right'
    }`}>
      {children}
    </th>
  );
}

function PercentileBar({ percentile }: { percentile: number }) {
  const barColor =
    percentile > 75
      ? 'bg-red-400'
      : percentile > 50
        ? 'bg-orange-400'
        : percentile > 25
          ? 'bg-yellow-400'
          : 'bg-green-400';

  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1 bg-neutral-800 relative">
        <div className={`absolute top-0 left-0 h-full ${barColor}`} style={{ width: `${percentile}%` }} />
        <div
          className="absolute top-[-1px] w-0.5 h-[6px] bg-fuchsia-400"
          style={{ left: `${percentile}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-500 w-6 text-right">{percentile.toFixed(0)}%</span>
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const s = signal.toUpperCase();
  let cls = 'text-neutral-500';
  if (s === 'STRESS' || s === 'DOLLAR_STRESS' || s === 'WIDENING') cls = 'text-red-400';
  if (s === 'SURPLUS' || s === 'DOLLAR_SURPLUS' || s === 'TIGHTENING') cls = 'text-green-400';
  if (s === 'ELEVATED' || s === 'WARNING') cls = 'text-orange-400';

  return (
    <span className={`text-[7px] font-mono font-bold px-1 py-px uppercase ${cls}`}>
      {signal}
    </span>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-[8px] font-mono text-neutral-600 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}
