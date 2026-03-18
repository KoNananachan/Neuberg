import { useState, useMemo, useCallback, useRef } from 'react';
import { useRelativeValuation, type ValuationMetrics, type PeerEntry } from '../../api/hooks/use-relative-valuation';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp } from 'lucide-react';

// ── Translation helper with fallback ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type MetricKey = keyof ValuationMetrics;
type SortKey = 'symbol' | MetricKey;

interface ChartPoint {
  symbol: string;
  name: string;
  x: number;
  y: number;
  r: number;
  isTarget: boolean;
  metrics: ValuationMetrics;
}

// ── Metric definitions ──

const METRIC_DEFS: Array<{
  key: MetricKey;
  label: string;
  short: string;
  format: (v: number | null) => string;
  inverted: boolean; // true = higher is better (profitability); false = lower is better (valuation)
}> = [
  { key: 'pe', label: 'P/E', short: 'P/E', format: (v) => v == null ? '-' : v.toFixed(1), inverted: false },
  { key: 'forwardPE', label: 'Fwd P/E', short: 'FwdPE', format: (v) => v == null ? '-' : v.toFixed(1), inverted: false },
  { key: 'pb', label: 'P/B', short: 'P/B', format: (v) => v == null ? '-' : v.toFixed(2), inverted: false },
  { key: 'ps', label: 'P/S', short: 'P/S', format: (v) => v == null ? '-' : v.toFixed(2), inverted: false },
  { key: 'peg', label: 'PEG', short: 'PEG', format: (v) => v == null ? '-' : v.toFixed(2), inverted: false },
  { key: 'evEbitda', label: 'EV/EBITDA', short: 'EV/EB', format: (v) => v == null ? '-' : v.toFixed(1), inverted: false },
  { key: 'debtEquity', label: 'D/E', short: 'D/E', format: (v) => v == null ? '-' : v.toFixed(1), inverted: false },
  { key: 'roe', label: 'ROE', short: 'ROE', format: (v) => v == null ? '-' : (v * 100).toFixed(1) + '%', inverted: true },
  { key: 'dividendYield', label: 'Div Yield', short: 'DivY', format: (v) => v == null ? '-' : (v * 100).toFixed(2) + '%', inverted: true },
  { key: 'marketCap', label: 'Mkt Cap', short: 'MCap', format: formatMktCap, inverted: true },
];

function formatMktCap(v: number | null): string {
  if (v == null) return '-';
  if (v >= 1e12) return (v / 1e12).toFixed(1) + 'T';
  if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return (v / 1e6).toFixed(0) + 'M';
  return v.toFixed(0);
}

// ── Axis options for scatter plot ──

const AXIS_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: 'pe', label: 'P/E' },
  { key: 'forwardPE', label: 'Fwd P/E' },
  { key: 'pb', label: 'P/B' },
  { key: 'ps', label: 'P/S' },
  { key: 'peg', label: 'PEG' },
  { key: 'evEbitda', label: 'EV/EBITDA' },
  { key: 'roe', label: 'ROE' },
  { key: 'debtEquity', label: 'D/E' },
];

// ── Constants ──

const CHART_W = 500;
const CHART_H = 260;
const PAD = { top: 20, right: 20, bottom: 30, left: 50 };
const MIN_R = 4;
const MAX_R = 20;

// ── Component ──

export function RelativeValuationPanel() {
  const t = useT();
  const [inputSymbol, setInputSymbol] = useState('AAPL');
  const [activeSymbol, setActiveSymbol] = useState('AAPL');
  const { data, isLoading, refetch } = useRelativeValuation(activeSymbol);

  const [xAxis, setXAxis] = useState<MetricKey>('pe');
  const [yAxis, setYAxis] = useState<MetricKey>('roe');
  const [sortKey, setSortKey] = useState<SortKey>('pe');
  const [sortAsc, setSortAsc] = useState(true);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const sym = inputSymbol.trim().toUpperCase();
    if (sym) setActiveSymbol(sym);
  }, [inputSymbol]);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(key === 'symbol'); }
  }, [sortKey]);

  // Build all entries (target + peers)
  const allEntries = useMemo(() => {
    if (!data) return [];
    const target: PeerEntry & { isTarget: boolean } = {
      symbol: data.target.symbol,
      name: data.target.name,
      metrics: data.target.metrics,
      isTarget: true,
    };
    const peers = data.peers.map((p) => ({ ...p, isTarget: false }));
    return [target, ...peers];
  }, [data]);

  // Sorted entries for the table
  const sortedEntries = useMemo(() => {
    const entries = [...allEntries];
    entries.sort((a, b) => {
      if (sortKey === 'symbol') {
        const cmp = a.symbol.localeCompare(b.symbol);
        return sortAsc ? cmp : -cmp;
      }
      const av = a.metrics[sortKey as MetricKey];
      const bv = b.metrics[sortKey as MetricKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return sortAsc ? av - bv : bv - av;
    });
    return entries;
  }, [allEntries, sortKey, sortAsc]);

  // Scatter chart data
  const chartPoints = useMemo((): ChartPoint[] => {
    return allEntries
      .filter((e) => e.metrics[xAxis] != null && e.metrics[yAxis] != null)
      .map((e) => {
        const caps = allEntries
          .map((en) => en.metrics.marketCap)
          .filter((c): c is number => c != null && c > 0);
        const minCap = Math.min(...caps);
        const maxCap = Math.max(...caps);
        const capRange = maxCap - minCap || 1;
        const capNorm = e.metrics.marketCap != null
          ? (e.metrics.marketCap - minCap) / capRange
          : 0.5;

        return {
          symbol: e.symbol,
          name: e.name,
          x: e.metrics[xAxis] as number,
          y: e.metrics[yAxis] as number,
          r: MIN_R + capNorm * (MAX_R - MIN_R),
          isTarget: e.isTarget,
          metrics: e.metrics,
        };
      });
  }, [allEntries, xAxis, yAxis]);

  // Axis ranges
  const { xMin, xMax, yMin, yMax } = useMemo(() => {
    if (chartPoints.length === 0) return { xMin: 0, xMax: 100, yMin: 0, yMax: 1 };
    const xs = chartPoints.map((p) => p.x);
    const ys = chartPoints.map((p) => p.y);
    const xPad = (Math.max(...xs) - Math.min(...xs)) * 0.15 || 5;
    const yPad = (Math.max(...ys) - Math.min(...ys)) * 0.15 || 0.05;
    return {
      xMin: Math.min(...xs) - xPad,
      xMax: Math.max(...xs) + xPad,
      yMin: Math.min(...ys) - yPad,
      yMax: Math.max(...ys) + yPad,
    };
  }, [chartPoints]);

  const scaleX = useCallback((v: number) => {
    return PAD.left + ((v - xMin) / (xMax - xMin || 1)) * (CHART_W - PAD.left - PAD.right);
  }, [xMin, xMax]);

  const scaleY = useCallback((v: number) => {
    return CHART_H - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (CHART_H - PAD.top - PAD.bottom);
  }, [yMin, yMax]);

  // Median lines
  const xMedian = data?.sectorMedians[xAxis] ?? null;
  const yMedian = data?.sectorMedians[yAxis] ?? null;

  // X-axis tick values
  const xTicks = useMemo(() => {
    const count = 5;
    const step = (xMax - xMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => xMin + i * step);
  }, [xMin, xMax]);

  // Y-axis tick values
  const yTicks = useMemo(() => {
    const count = 4;
    const step = (yMax - yMin) / count;
    return Array.from({ length: count + 1 }, (_, i) => yMin + i * step);
  }, [yMin, yMax]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const svgScaleX = CHART_W / rect.width;
    const svgScaleY = CHART_H / rect.height;
    const sx = mx * svgScaleX;
    const sy = my * svgScaleY;

    let closest: ChartPoint | null = null;
    let closestDist = Infinity;
    for (const p of chartPoints) {
      const px = scaleX(p.x);
      const py = scaleY(p.y);
      const dist = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2);
      if (dist < p.r + 8 && dist < closestDist) {
        closest = p;
        closestDist = dist;
      }
    }
    if (closest) {
      setHoveredSymbol(closest.symbol);
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    } else {
      setHoveredSymbol(null);
      setTooltipPos(null);
    }
  }, [chartPoints, scaleX, scaleY]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSymbol(null);
    setTooltipPos(null);
  }, []);

  // Find hovered entry for tooltip
  const hoveredEntry = useMemo(() => {
    if (!hoveredSymbol) return null;
    return allEntries.find((e) => e.symbol === hoveredSymbol) ?? null;
  }, [hoveredSymbol, allEntries]);

  // Color helper for table cells
  const cellColor = useCallback((value: number | null, medianVal: number | null, inverted: boolean): string => {
    if (value == null || medianVal == null || !isFinite(value) || !isFinite(medianVal)) return 'text-neutral/60';
    if (inverted) {
      // Higher is better: green if above median, red if below
      return value > medianVal ? 'text-emerald-400' : value < medianVal ? 'text-red-400' : 'text-neutral/60';
    }
    // Lower is better (valuation): green if below median, red if above
    return value < medianVal ? 'text-emerald-400' : value > medianVal ? 'text-red-400' : 'text-neutral/60';
  }, []);

  // Format y-axis tick
  const formatYTick = useCallback((v: number): string => {
    const def = METRIC_DEFS.find((d) => d.key === yAxis);
    if (!def) return v.toFixed(1);
    return def.format(v);
  }, [yAxis]);

  const formatXTick = useCallback((v: number): string => {
    const def = METRIC_DEFS.find((d) => d.key === xAxis);
    if (!def) return v.toFixed(1);
    return def.format(v);
  }, [xAxis]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr(t, 'panelRelativeValuation', 'RELATIVE VALUATION')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.target.sector && (
            <span className="text-[7px] font-mono uppercase tracking-wider px-1.5 py-0.5 bg-violet-500/10 text-violet-400 border border-violet-500/30">
              {data.target.sector}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-violet-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Symbol input */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-1">
          <span className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr(t, 'rvSymbol', 'SYMBOL')}
          </span>
          <input
            type="text"
            value={inputSymbol}
            onChange={(e) => setInputSymbol(e.target.value.toUpperCase())}
            className="w-16 bg-black border border-border/30 text-[9px] font-mono font-bold text-white px-1.5 py-0.5 focus:outline-none focus:border-violet-500/50"
            placeholder="AAPL"
          />
          <button
            type="submit"
            className="px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border border-violet-500/30 text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
          >
            {tr(t, 'rvGo', 'GO')}
          </button>
        </form>

        {/* Axis selectors */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[7px] font-mono text-neutral/30 uppercase">X:</span>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value as MetricKey)}
            className="bg-black border border-border/20 text-[8px] font-mono text-neutral/60 px-1 py-0.5 focus:outline-none"
          >
            {AXIS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <span className="text-[7px] font-mono text-neutral/30 uppercase">Y:</span>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value as MetricKey)}
            className="bg-black border border-border/20 text-[8px] font-mono text-neutral/60 px-1 py-0.5 focus:outline-none"
          >
            {AXIS_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-12 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'rvLoading', 'LOADING PEER COMPARISON...')}
          </div>
        )}

        {data && (
          <>
            {/* Scatter Plot */}
            <div className="relative px-3 py-2">
              <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider mb-1">
                {tr(t, 'rvScatter', 'PEER SCATTER')} &mdash;{' '}
                {AXIS_OPTIONS.find((o) => o.key === xAxis)?.label} vs {AXIS_OPTIONS.find((o) => o.key === yAxis)?.label}
                {' '}({tr(t, 'rvBubbleSize', 'bubble size = market cap')})
              </div>
              <svg
                ref={svgRef}
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                className="w-full"
                style={{ maxHeight: 260 }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
              >
                {/* Grid lines */}
                {xTicks.map((tick, i) => (
                  <line
                    key={`xg-${i}`}
                    x1={scaleX(tick)}
                    y1={PAD.top}
                    x2={scaleX(tick)}
                    y2={CHART_H - PAD.bottom}
                    stroke="#333"
                    strokeWidth={0.5}
                  />
                ))}
                {yTicks.map((tick, i) => (
                  <line
                    key={`yg-${i}`}
                    x1={PAD.left}
                    y1={scaleY(tick)}
                    x2={CHART_W - PAD.right}
                    y2={scaleY(tick)}
                    stroke="#333"
                    strokeWidth={0.5}
                  />
                ))}

                {/* Sector median crosshairs */}
                {xMedian != null && (
                  <line
                    x1={scaleX(xMedian)}
                    y1={PAD.top}
                    x2={scaleX(xMedian)}
                    y2={CHART_H - PAD.bottom}
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                )}
                {yMedian != null && (
                  <line
                    x1={PAD.left}
                    y1={scaleY(yMedian)}
                    x2={CHART_W - PAD.right}
                    y2={scaleY(yMedian)}
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="4 3"
                    opacity={0.5}
                  />
                )}

                {/* X-axis labels */}
                {xTicks.map((tick, i) => (
                  <text
                    key={`xl-${i}`}
                    x={scaleX(tick)}
                    y={CHART_H - 5}
                    textAnchor="middle"
                    className="fill-neutral/40"
                    style={{ fontSize: 8, fontFamily: 'monospace' }}
                  >
                    {formatXTick(tick)}
                  </text>
                ))}

                {/* Y-axis labels */}
                {yTicks.map((tick, i) => (
                  <text
                    key={`yl-${i}`}
                    x={PAD.left - 5}
                    y={scaleY(tick) + 3}
                    textAnchor="end"
                    className="fill-neutral/40"
                    style={{ fontSize: 8, fontFamily: 'monospace' }}
                  >
                    {formatYTick(tick)}
                  </text>
                ))}

                {/* Axis labels */}
                <text
                  x={CHART_W / 2}
                  y={CHART_H}
                  textAnchor="middle"
                  className="fill-neutral/50"
                  style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase' }}
                >
                  {AXIS_OPTIONS.find((o) => o.key === xAxis)?.label}
                </text>
                <text
                  x={12}
                  y={CHART_H / 2}
                  textAnchor="middle"
                  className="fill-neutral/50"
                  style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 'bold', textTransform: 'uppercase' }}
                  transform={`rotate(-90, 12, ${CHART_H / 2})`}
                >
                  {AXIS_OPTIONS.find((o) => o.key === yAxis)?.label}
                </text>

                {/* Bubbles - peers first, target on top */}
                {chartPoints
                  .filter((p) => !p.isTarget)
                  .map((p) => (
                    <g key={p.symbol}>
                      <circle
                        cx={scaleX(p.x)}
                        cy={scaleY(p.y)}
                        r={p.r}
                        fill={hoveredSymbol === p.symbol ? '#8b5cf6' : '#6d28d9'}
                        fillOpacity={hoveredSymbol === p.symbol ? 0.7 : 0.3}
                        stroke={hoveredSymbol === p.symbol ? '#a78bfa' : '#7c3aed'}
                        strokeWidth={hoveredSymbol === p.symbol ? 1.5 : 0.8}
                      />
                      <text
                        x={scaleX(p.x)}
                        y={scaleY(p.y) - p.r - 3}
                        textAnchor="middle"
                        className="fill-neutral/50"
                        style={{ fontSize: 7, fontFamily: 'monospace' }}
                      >
                        {p.symbol}
                      </text>
                    </g>
                  ))}
                {chartPoints
                  .filter((p) => p.isTarget)
                  .map((p) => (
                    <g key={p.symbol}>
                      <circle
                        cx={scaleX(p.x)}
                        cy={scaleY(p.y)}
                        r={p.r}
                        fill="#06b6d4"
                        fillOpacity={0.6}
                        stroke="#22d3ee"
                        strokeWidth={2}
                      />
                      <text
                        x={scaleX(p.x)}
                        y={scaleY(p.y) - p.r - 3}
                        textAnchor="middle"
                        className="fill-cyan-400"
                        style={{ fontSize: 8, fontFamily: 'monospace', fontWeight: 'bold' }}
                      >
                        {p.symbol}
                      </text>
                    </g>
                  ))}
              </svg>

              {/* Tooltip */}
              {hoveredEntry && tooltipPos && (
                <div
                  className="absolute z-50 pointer-events-none border border-violet-500/40 bg-black/95 px-2 py-1.5"
                  style={{
                    left: Math.min(tooltipPos.x + 12, 280),
                    top: tooltipPos.y - 10,
                  }}
                >
                  <div className="text-[9px] font-mono font-bold text-white">
                    {hoveredEntry.symbol}
                  </div>
                  <div className="text-[7px] font-mono text-neutral/50 mb-1 max-w-[160px] truncate">
                    {hoveredEntry.name}
                  </div>
                  {METRIC_DEFS.map((def) => (
                    <div key={def.key} className="flex justify-between gap-3 text-[7px] font-mono">
                      <span className="text-neutral/40">{def.short}</span>
                      <span className="text-neutral/70">{def.format(hoveredEntry.metrics[def.key])}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-cyan-400/60 border border-cyan-400" />
                  <span className="text-[7px] font-mono text-neutral/40">{tr(t, 'rvTarget', 'TARGET')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-violet-600/30 border border-violet-500" />
                  <span className="text-[7px] font-mono text-neutral/40">{tr(t, 'rvPeers', 'PEERS')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 border-t border-dashed border-violet-500/50" />
                  <span className="text-[7px] font-mono text-neutral/40">{tr(t, 'rvMedian', 'SECTOR MEDIAN')}</span>
                </div>
              </div>
            </div>

            {/* Metrics Table */}
            <div className="px-3 pb-2">
              <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider mb-1">
                {tr(t, 'rvComparison', 'VALUATION COMPARISON')}
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full min-w-[700px] border-collapse">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left pr-2 py-1">
                        <TableSortHeader
                          label={tr(t, 'symbol', 'SYMBOL')}
                          k="symbol"
                          current={sortKey}
                          asc={sortAsc}
                          onClick={handleSort}
                        />
                      </th>
                      {METRIC_DEFS.map((def) => (
                        <th key={def.key} className="text-right px-1 py-1">
                          <TableSortHeader
                            label={def.short}
                            k={def.key}
                            current={sortKey}
                            asc={sortAsc}
                            onClick={handleSort}
                            align="right"
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Sector Median row */}
                    <tr className="border-b border-violet-500/20 bg-violet-500/5">
                      <td className="text-[8px] font-mono font-bold text-violet-400 pr-2 py-1 uppercase">
                        {tr(t, 'rvSectorMedian', 'MEDIAN')}
                      </td>
                      {METRIC_DEFS.map((def) => (
                        <td key={def.key} className="text-right text-[8px] font-mono text-violet-400/70 px-1 py-1">
                          {def.format(data.sectorMedians[def.key])}
                        </td>
                      ))}
                    </tr>
                    {/* Data rows */}
                    {sortedEntries.map((entry) => {
                      const isTarget = entry.isTarget;
                      return (
                        <tr
                          key={entry.symbol}
                          className={`border-b border-border/10 transition-colors ${
                            isTarget
                              ? 'bg-cyan-500/5 hover:bg-cyan-500/10'
                              : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="pr-2 py-1">
                            <div className={`text-[9px] font-mono font-bold ${isTarget ? 'text-cyan-400' : 'text-white'}`}>
                              {entry.symbol}
                            </div>
                            <div className="text-[6px] font-mono text-neutral/30 max-w-[100px] truncate">
                              {entry.name}
                            </div>
                          </td>
                          {METRIC_DEFS.map((def) => {
                            const value = entry.metrics[def.key];
                            const medianVal = data.sectorMedians[def.key];
                            const color = isTarget
                              ? cellColor(value, medianVal, def.inverted)
                              : 'text-neutral/60';
                            return (
                              <td key={def.key} className={`text-right text-[8px] font-mono px-1 py-1 ${color}`}>
                                {def.format(value)}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {!isLoading && !data && (
          <div className="text-center py-12 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'rvNoData', 'ENTER A SYMBOL TO VIEW PEER COMPARISON')}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[8px] font-mono text-neutral/30">
          {data ? `${data.peers.length + 1} ${tr(t, 'rvCompanies', 'companies')}` : ''}
        </span>
        <span className="text-[7px] font-mono text-neutral/20 uppercase">
          {tr(t, 'rvSource', 'SOURCE: YAHOO FINANCE')}
        </span>
      </div>
    </div>
  );
}

// ── Table sort header ──

function TableSortHeader({ label, k, current, asc, onClick, align }: {
  label: string;
  k: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
  align?: 'right' | 'left';
}) {
  const active = current === k;
  return (
    <button
      onClick={() => onClick(k)}
      className={`text-[7px] font-black font-mono uppercase tracking-wider whitespace-nowrap ${
        align === 'right' ? 'text-right w-full inline-block' : ''
      } ${active ? 'text-violet-400' : 'text-neutral/40 hover:text-neutral/60'}`}
    >
      {label}{active ? (asc ? ' \u2191' : ' \u2193') : ''}
    </button>
  );
}
