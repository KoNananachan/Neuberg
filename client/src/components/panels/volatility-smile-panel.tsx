import { useState, useMemo, useCallback } from 'react';
import { useVolatilitySmile } from '../../api/hooks/use-volatility-smile';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp } from 'lucide-react';

// ── i18n fallback helper ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Types ──

interface SmilePoint {
  moneyness: number;
  impliedVol: number;
  strike: number;
  delta: number;
}

interface SmileEntry {
  underlying: string;
  expiry: string;
  atmVol: number;
  points: SmilePoint[];
}

interface SkewMetric {
  underlying: string;
  atmVol: number;
  skew25d: number;
  skew10d: number;
  butterfly: number;
  riskReversal: number;
  skewChange: number;
  percentile: number;
  richCheap: string;
}

interface TermStructureEntry {
  expiry: string;
  daysToExpiry: number;
  atmVol: number;
  skew: number;
  realizedVol: number;
  volRiskPremium: number;
}

interface SmileSummary {
  avgAtmVol: number;
  steepestSkew: { underlying: string; value: number };
  flattestSkew: { underlying: string; value: number };
  termStructureSlope: number;
}

interface VolatilitySmileData {
  smiles: SmileEntry[];
  skewMetrics: SkewMetric[];
  termStructure: TermStructureEntry[];
  summary: SmileSummary;
}

// ── Colors ──

const VIOLET = '#a78bfa';

const UNDERLYING_COLORS: Record<string, string> = {
  SPY: '#a78bfa',
  QQQ: '#38bdf8',
  IWM: '#f472b6',
  AAPL: '#34d399',
  TSLA: '#fb923c',
  NVDA: '#facc15',
  AMZN: '#f87171',
  MSFT: '#818cf8',
  META: '#22d3ee',
  GLD: '#fbbf24',
};

function getUnderlyingColor(symbol: string): string {
  return UNDERLYING_COLORS[symbol] ?? '#a78bfa';
}

// ── Badge / color helpers ──

function richCheapBadge(label: string): { text: string; cls: string } {
  const upper = label.toUpperCase();
  if (upper === 'RICH') return { text: 'RICH', cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (upper === 'CHEAP') return { text: 'CHEAP', cls: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30' };
  return { text: upper, cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
}

function percentileColor(pct: number): string {
  if (pct >= 80) return 'text-red-400';
  if (pct >= 60) return 'text-yellow-400';
  if (pct >= 40) return 'text-neutral-400';
  if (pct >= 20) return 'text-emerald-400';
  return 'text-blue-400';
}

function skewChangeColor(val: number): string {
  if (val > 0.5) return 'text-red-400';
  if (val > 0) return 'text-orange-400';
  if (val < -0.5) return 'text-emerald-400';
  if (val < 0) return 'text-blue-400';
  return 'text-neutral-500';
}

function fmtSign(val: number, decimals = 2): string {
  return `${val > 0 ? '+' : ''}${val.toFixed(decimals)}`;
}

// ── Tab type ──

type ViewTab = 'SMILE' | 'SKEW' | 'TERM';

// ── Main Panel ──

export function VolatilitySmilePanel() {
  const tr = useTr();
  const [activeTab, setActiveTab] = useState<ViewTab>('SMILE');
  const { data, isLoading, refetch } = useVolatilitySmile();

  const smileData = data as VolatilitySmileData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr('volSmileTitle', 'VOLATILITY SMILE / SKEW')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {smileData?.summary && (
        <div className="grid grid-cols-4 border-b border-violet-400/30 shrink-0">
          <SummaryCell
            label={tr('volSmileAvgAtm', 'AVG ATM VOL')}
            value={`${smileData.summary.avgAtmVol.toFixed(1)}%`}
            cls="text-white"
          />
          <SummaryCell
            label={tr('volSmileSteepest', 'STEEPEST SKEW')}
            value={`${smileData.summary.steepestSkew.underlying} ${fmtSign(smileData.summary.steepestSkew.value)}`}
            cls="text-red-400"
          />
          <SummaryCell
            label={tr('volSmileFlattest', 'FLATTEST SKEW')}
            value={`${smileData.summary.flattestSkew.underlying} ${fmtSign(smileData.summary.flattestSkew.value)}`}
            cls="text-emerald-400"
          />
          <SummaryCell
            label={tr('volSmileTermSlope', 'TERM SLOPE')}
            value={fmtSign(smileData.summary.termStructureSlope)}
            cls={smileData.summary.termStructureSlope > 0 ? 'text-emerald-400' : 'text-red-400'}
          />
        </div>
      )}

      {/* View tabs */}
      <div className="flex border-b border-violet-400/30 shrink-0">
        {(
          [
            ['SMILE', tr('volSmileSmileTab', 'SMILE')],
            ['SKEW', tr('volSmileSkewTab', 'SKEW METRICS')],
            ['TERM', tr('volSmileTermTab', 'TERM STRUCTURE')],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as ViewTab)}
            className={`flex-1 py-1.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
              activeTab === key
                ? 'text-violet-400 border-b border-violet-400 bg-violet-500/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !smileData && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!smileData && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr('volSmileNoData', 'NO DATA AVAILABLE')}
          </div>
        )}

        {smileData && (
          <>
            {activeTab === 'SMILE' && <SmileView smiles={smileData.smiles} tr={tr} />}
            {activeTab === 'SKEW' && <SkewMetricsView metrics={smileData.skewMetrics} tr={tr} />}
            {activeTab === 'TERM' && <TermStructureView entries={smileData.termStructure} tr={tr} />}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Cell ──

function SummaryCell({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="px-2 py-1.5 bg-black border-r border-violet-400/10 last:border-r-0">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-black font-mono leading-none mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}

// ── SMILE View ──

function SmileView({
  smiles,
  tr,
}: {
  smiles: SmileEntry[];
  tr: (key: string, fallback: string) => string;
}) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    underlying: string;
    moneyness: number;
    iv: number;
    strike: number;
  } | null>(null);

  if (smiles.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr('volSmileNoSmiles', 'NO SMILE DATA')}
      </div>
    );
  }

  // Group smiles by underlying for chart rendering
  const grouped = useMemo(() => {
    const map = new Map<string, SmileEntry[]>();
    for (const s of smiles) {
      const existing = map.get(s.underlying);
      if (existing) {
        existing.push(s);
      } else {
        map.set(s.underlying, [s]);
      }
    }
    return map;
  }, [smiles]);

  return (
    <div className="px-3 py-3 space-y-4">
      {Array.from(grouped.entries()).map(([underlying, entries]) => (
        <SmileChart
          key={underlying}
          underlying={underlying}
          entries={entries}
          hoveredPoint={hoveredPoint}
          onHover={setHoveredPoint}
          tr={tr}
        />
      ))}
    </div>
  );
}

// ── Smile Chart (per underlying) ──

function SmileChart({
  underlying,
  entries,
  hoveredPoint,
  onHover,
  tr,
}: {
  underlying: string;
  entries: SmileEntry[];
  hoveredPoint: { underlying: string; moneyness: number; iv: number; strike: number } | null;
  onHover: (pt: { underlying: string; moneyness: number; iv: number; strike: number } | null) => void;
  tr: (key: string, fallback: string) => string;
}) {
  const chartData = useMemo(() => {
    const allPoints = entries.flatMap((e) => e.points);
    if (allPoints.length === 0) return null;

    const W = 340;
    const H = 160;
    const PAD_L = 40;
    const PAD_R = 14;
    const PAD_T = 16;
    const PAD_B = 28;

    const allMoneyness = allPoints.map((p) => p.moneyness);
    const allIv = allPoints.map((p) => p.impliedVol);

    const minM = Math.min(...allMoneyness);
    const maxM = Math.max(...allMoneyness);
    const minIv = Math.floor(Math.min(...allIv) - 1);
    const maxIv = Math.ceil(Math.max(...allIv) + 1);

    const rangeM = maxM - minM || 1;
    const rangeIv = maxIv - minIv || 1;

    const scaleX = (m: number) => PAD_L + ((m - minM) / rangeM) * (W - PAD_L - PAD_R);
    const scaleY = (iv: number) => PAD_T + ((maxIv - iv) / rangeIv) * (H - PAD_T - PAD_B);

    // Y-axis ticks
    const yStep = rangeIv > 20 ? 5 : rangeIv > 10 ? 2 : 1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minIv / yStep) * yStep; v <= maxIv; v += yStep) {
      yTicks.push(v);
    }

    // X-axis ticks (moneyness)
    const xTicks: number[] = [];
    const xStep = rangeM > 0.3 ? 0.1 : rangeM > 0.1 ? 0.05 : 0.02;
    for (let m = Math.ceil(minM / xStep) * xStep; m <= maxM; m += xStep) {
      xTicks.push(Number(m.toFixed(3)));
    }

    // ATM vertical line at moneyness = 1.0
    const atmX = scaleX(1.0);
    const atmInRange = 1.0 >= minM && 1.0 <= maxM;

    // Build paths per entry (expiry)
    const color = getUnderlyingColor(underlying);
    const paths = entries.map((entry) => {
      const sorted = [...entry.points].sort((a, b) => a.moneyness - b.moneyness);
      const d = sorted
        .map(
          (pt, i) =>
            `${i === 0 ? 'M' : 'L'} ${scaleX(pt.moneyness).toFixed(1)},${scaleY(pt.impliedVol).toFixed(1)}`,
        )
        .join(' ');
      return { expiry: entry.expiry, d, points: sorted, atmVol: entry.atmVol };
    });

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, paths, yTicks, xTicks, scaleX, scaleY, atmX, atmInRange, color };
  }, [entries, underlying]);

  if (!chartData) return null;

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, paths, yTicks, xTicks, scaleX, scaleY, atmX, atmInRange, color } =
    chartData;

  return (
    <div className="border border-violet-400/10 bg-[#030303]">
      {/* Chart header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-violet-400/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2" style={{ backgroundColor: color }} />
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-violet-400">
            {underlying}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            {tr('volSmileChartLabel', 'SMILE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {paths.map((p) => (
            <span key={p.expiry} className="text-[7px] font-mono text-neutral-600">
              {p.expiry}: ATM {p.atmVol.toFixed(1)}%
            </span>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
        {/* Grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={scaleY(v)}
              x2={W - PAD_R}
              y2={scaleY(v)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(v) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={7}
              fontFamily="monospace"
            >
              {v.toFixed(0)}%
            </text>
          </g>
        ))}

        {/* X-axis labels (moneyness) */}
        {xTicks.map((m) => (
          <text
            key={m}
            x={scaleX(m)}
            y={H - 6}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {m.toFixed(2)}
          </text>
        ))}

        {/* ATM vertical line */}
        {atmInRange && (
          <>
            <line
              x1={atmX}
              y1={PAD_T}
              x2={atmX}
              y2={H - PAD_B}
              stroke="rgba(167,139,250,0.35)"
              strokeDasharray="3,3"
              strokeWidth={1}
            />
            <text
              x={atmX}
              y={PAD_T - 4}
              textAnchor="middle"
              fill="rgba(167,139,250,0.7)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              ATM
            </text>
          </>
        )}

        {/* Smile curves */}
        {paths.map((p, pathIdx) => {
          const opacity = paths.length > 1 ? 1 - pathIdx * 0.2 : 1;
          return (
            <g key={p.expiry}>
              {/* Area fill under curve */}
              {p.points.length > 1 && (
                <path
                  d={`${p.d} L ${scaleX(p.points[p.points.length - 1].moneyness).toFixed(1)},${(H - PAD_B).toFixed(1)} L ${scaleX(p.points[0].moneyness).toFixed(1)},${(H - PAD_B).toFixed(1)} Z`}
                  fill={color}
                  opacity={0.04 * opacity}
                />
              )}
              <path
                d={p.d}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.85 * opacity}
              />
              {/* Data points */}
              {p.points.map((pt) => {
                const isAtm = Math.abs(pt.moneyness - 1.0) < 0.005;
                const isHovered =
                  hoveredPoint?.underlying === underlying &&
                  hoveredPoint.moneyness === pt.moneyness;
                return (
                  <circle
                    key={`${p.expiry}-${pt.moneyness}`}
                    cx={scaleX(pt.moneyness)}
                    cy={scaleY(pt.impliedVol)}
                    r={isAtm ? 4 : isHovered ? 3.5 : 2}
                    fill={isAtm ? '#facc15' : color}
                    stroke={isAtm ? '#000' : 'none'}
                    strokeWidth={isAtm ? 0.5 : 0}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      onHover({
                        underlying,
                        moneyness: pt.moneyness,
                        iv: pt.impliedVol,
                        strike: pt.strike,
                      })
                    }
                    onMouseLeave={() => onHover(null)}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Hover tooltip */}
        {hoveredPoint &&
          hoveredPoint.underlying === underlying &&
          (() => {
            const x = scaleX(hoveredPoint.moneyness);
            const y = scaleY(hoveredPoint.iv);
            const rectW = 80;
            const rectH = 34;
            const tx = Math.min(x + 8, W - PAD_R - rectW);
            const ty = Math.max(y - rectH - 4, PAD_T);
            return (
              <g>
                <rect
                  x={tx}
                  y={ty}
                  width={rectW}
                  height={rectH}
                  fill="rgba(0,0,0,0.9)"
                  stroke={color}
                  strokeWidth={0.5}
                />
                <text
                  x={tx + 4}
                  y={ty + 10}
                  fill={color}
                  fontSize={7}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  K: {hoveredPoint.strike.toFixed(1)} | M: {hoveredPoint.moneyness.toFixed(3)}
                </text>
                <text
                  x={tx + 4}
                  y={ty + 20}
                  fill="rgba(255,255,255,0.85)"
                  fontSize={7}
                  fontFamily="monospace"
                >
                  IV: {hoveredPoint.iv.toFixed(2)}%
                </text>
                <text
                  x={tx + 4}
                  y={ty + 29}
                  fill="rgba(255,255,255,0.5)"
                  fontSize={6}
                  fontFamily="monospace"
                >
                  {Math.abs(hoveredPoint.moneyness - 1.0) < 0.005 ? 'ATM' : hoveredPoint.moneyness < 1 ? 'OTM PUT' : 'OTM CALL'}
                </text>
              </g>
            );
          })()}
      </svg>
    </div>
  );
}

// ── SKEW METRICS View ──

function SkewMetricsView({
  metrics,
  tr,
}: {
  metrics: SkewMetric[];
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <div className="overflow-x-auto">
      {/* Column headers */}
      <div className="grid grid-cols-[60px_52px_52px_52px_52px_56px_52px_44px_56px] px-2 py-1 border-b border-violet-400/30 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap bg-[#030303]">
        <span>{tr('volSmileUnderlying', 'UNDRL')}</span>
        <span className="text-right">{tr('volSmileAtmVol', 'ATM VOL')}</span>
        <span className="text-right">{tr('volSmile25dSkew', '25D SKEW')}</span>
        <span className="text-right">{tr('volSmile10dSkew', '10D SKEW')}</span>
        <span className="text-right">{tr('volSmileBfly', 'BFLY')}</span>
        <span className="text-right">{tr('volSmileRR', 'RISK REV')}</span>
        <span className="text-right">{tr('volSmileSkewChg', 'CHG')}</span>
        <span className="text-right">{tr('volSmilePctl', 'PCTL')}</span>
        <span className="text-right">{tr('volSmileRichCheap', 'R/C')}</span>
      </div>

      {/* Rows */}
      {metrics.map((m) => (
        <SkewRow key={m.underlying} metric={m} />
      ))}
    </div>
  );
}

function SkewRow({ metric }: { metric: SkewMetric }) {
  const badge = richCheapBadge(metric.richCheap);
  const color = getUnderlyingColor(metric.underlying);

  return (
    <div className="grid grid-cols-[60px_52px_52px_52px_52px_56px_52px_44px_56px] px-2 py-1.5 border-b border-violet-400/10 hover:bg-violet-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap">
      <span className="font-bold" style={{ color }}>
        {metric.underlying}
      </span>
      <span className="text-right text-white font-bold">{metric.atmVol.toFixed(1)}%</span>
      <span className={`text-right font-bold ${metric.skew25d < -4 ? 'text-red-400' : metric.skew25d < -2 ? 'text-orange-400' : 'text-neutral-400'}`}>
        {fmtSign(metric.skew25d)}
      </span>
      <span className={`text-right ${metric.skew10d < -6 ? 'text-red-400' : metric.skew10d < -3 ? 'text-orange-400' : 'text-neutral-400'}`}>
        {fmtSign(metric.skew10d)}
      </span>
      <span className="text-right text-blue-400">{metric.butterfly.toFixed(2)}</span>
      <span className={`text-right ${metric.riskReversal < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
        {fmtSign(metric.riskReversal)}
      </span>
      <span className={`text-right ${skewChangeColor(metric.skewChange)}`}>
        {fmtSign(metric.skewChange)}
      </span>
      <span className={`text-right font-bold ${percentileColor(metric.percentile)}`}>
        {metric.percentile}
      </span>
      <span className="text-right">
        <span className={`px-1 py-0.5 text-[7px] font-black uppercase tracking-wider ${badge.cls}`}>
          {badge.text}
        </span>
      </span>
    </div>
  );
}

// ── TERM STRUCTURE View (SPY) ──

function TermStructureView({
  entries,
  tr,
}: {
  entries: TermStructureEntry[];
  tr: (key: string, fallback: string) => string;
}) {
  // Determine contango vs backwardation
  const slopeLabel = useMemo(() => {
    if (entries.length < 2) return null;
    const first = entries[0];
    const last = entries[entries.length - 1];
    const diff = last.atmVol - first.atmVol;
    if (diff > 0.5) return { text: 'CONTANGO', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
    if (diff < -0.5) return { text: 'BACKWARDATION', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    return { text: 'FLAT', cls: 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30' };
  }, [entries]);

  // SVG chart for term structure
  const chartData = useMemo(() => {
    if (entries.length < 2) return null;

    const W = 340;
    const H = 140;
    const PAD_L = 40;
    const PAD_R = 14;
    const PAD_T = 14;
    const PAD_B = 28;

    const atmVols = entries.map((e) => e.atmVol);
    const rvVols = entries.map((e) => e.realizedVol);
    const allVols = [...atmVols, ...rvVols];
    const minV = Math.floor(Math.min(...allVols) - 1);
    const maxV = Math.ceil(Math.max(...allVols) + 1);
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) => PAD_L + (i / (entries.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxV - v) / rangeV) * (H - PAD_T - PAD_B);

    const atmPath = entries
      .map((e, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(e.atmVol).toFixed(1)}`)
      .join(' ');
    const rvPath = entries
      .map((e, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(e.realizedVol).toFixed(1)}`)
      .join(' ');

    // Y ticks
    const yStep = rangeV > 20 ? 5 : rangeV > 10 ? 2 : 1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minV / yStep) * yStep; v <= maxV; v += yStep) {
      yTicks.push(v);
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, atmPath, rvPath, yTicks, scaleX, scaleY };
  }, [entries]);

  return (
    <div className="px-3 py-3">
      {/* Header with slope indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
          {tr('volSmileTermStructure', 'SPY TERM STRUCTURE')}
        </div>
        <div className="flex items-center gap-2">
          {slopeLabel && (
            <span
              className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border ${slopeLabel.cls}`}
            >
              {slopeLabel.text}
            </span>
          )}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-px bg-violet-400" />
              <span className="text-[6px] font-mono text-neutral-600">IV</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-px bg-blue-400 opacity-60" style={{ borderTop: '1px dashed' }} />
              <span className="text-[6px] font-mono text-neutral-600">RV</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG chart */}
      {chartData && (
        <svg viewBox={`0 0 ${chartData.W} ${chartData.H}`} className="w-full mb-3" style={{ maxHeight: 170 }}>
          {/* Grid */}
          {chartData.yTicks.map((v) => (
            <g key={v}>
              <line
                x1={chartData.PAD_L}
                y1={chartData.scaleY(v)}
                x2={chartData.W - chartData.PAD_R}
                y2={chartData.scaleY(v)}
                stroke="rgba(255,255,255,0.04)"
                strokeDasharray="2,2"
              />
              <text
                x={chartData.PAD_L - 4}
                y={chartData.scaleY(v) + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                {v.toFixed(0)}%
              </text>
            </g>
          ))}

          {/* X labels */}
          {entries.map((e, i) => (
            <text
              key={e.expiry}
              x={chartData.scaleX(i)}
              y={chartData.H - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {e.expiry}
            </text>
          ))}

          {/* Realized vol path */}
          <path
            d={chartData.rvPath}
            fill="none"
            stroke="rgba(96,165,250,0.5)"
            strokeWidth={1}
            strokeDasharray="4,2"
          />

          {/* ATM vol area fill */}
          <path
            d={`${chartData.atmPath} L ${chartData.scaleX(entries.length - 1).toFixed(1)},${(chartData.H - chartData.PAD_B).toFixed(1)} L ${chartData.scaleX(0).toFixed(1)},${(chartData.H - chartData.PAD_B).toFixed(1)} Z`}
            fill="rgba(167,139,250,0.06)"
          />

          {/* ATM vol path */}
          <path d={chartData.atmPath} fill="none" stroke={VIOLET} strokeWidth={2} />

          {/* Data points */}
          {entries.map((e, i) => (
            <g key={e.expiry}>
              <circle cx={chartData.scaleX(i)} cy={chartData.scaleY(e.atmVol)} r={3} fill={VIOLET} />
              <circle cx={chartData.scaleX(i)} cy={chartData.scaleY(e.atmVol)} r={1.2} fill="#000" />
              <circle
                cx={chartData.scaleX(i)}
                cy={chartData.scaleY(e.realizedVol)}
                r={2}
                fill="rgba(96,165,250,0.7)"
              />
            </g>
          ))}
        </svg>
      )}

      {/* Term structure table */}
      <div className="border border-violet-400/10 bg-[#030303]">
        {/* Column headers */}
        <div className="grid grid-cols-[64px_48px_52px_48px_52px_60px] px-2 py-1 border-b border-violet-400/30 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap">
          <span>{tr('volSmileExpiry', 'EXPIRY')}</span>
          <span className="text-right">{tr('volSmileDte', 'DTE')}</span>
          <span className="text-right">{tr('volSmileAtmIv', 'ATM IV')}</span>
          <span className="text-right">{tr('volSmileSkew', 'SKEW')}</span>
          <span className="text-right">{tr('volSmileRv', 'RV')}</span>
          <span className="text-right">{tr('volSmileVrp', 'VOL RISK P')}</span>
        </div>

        {/* Rows */}
        {entries.map((entry) => (
          <TermRow key={entry.expiry} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function TermRow({ entry }: { entry: TermStructureEntry }) {
  const vrpPositive = entry.volRiskPremium > 0;

  return (
    <div className="grid grid-cols-[64px_48px_52px_48px_52px_60px] px-2 py-1.5 border-b border-violet-400/10 hover:bg-violet-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap">
      <span className="text-violet-400 font-bold">{entry.expiry}</span>
      <span className="text-right text-neutral-500">{entry.daysToExpiry}</span>
      <span className="text-right text-white font-bold">{entry.atmVol.toFixed(1)}%</span>
      <span
        className={`text-right ${entry.skew < -4 ? 'text-red-400' : entry.skew < -2 ? 'text-orange-400' : 'text-neutral-400'}`}
      >
        {fmtSign(entry.skew)}
      </span>
      <span className="text-right text-blue-400">{entry.realizedVol.toFixed(1)}%</span>
      <span className={`text-right font-bold ${vrpPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {fmtSign(entry.volRiskPremium)}
      </span>
    </div>
  );
}
