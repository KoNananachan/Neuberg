import { useState, useMemo, useCallback } from 'react';
import { useYieldCurve, useYieldCurveHistory, type YieldPoint, type HistoricalCurve } from '../../api/hooks/use-yield-curve';
import { useT } from '../../i18n';
import { TrendingUp, RefreshCw } from 'lucide-react';

type Tab = 'current' | 'history';

// Safe translation helper with fallback
function useTr() {
  const t = useT();
  return (key: string, fallback: string) => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

export function YieldCurvePanel() {
  const tr = useTr();
  const [tab, setTab] = useState<Tab>('current');
  const { data, isLoading, refetch } = useYieldCurve();
  const { data: historyData } = useYieldCurveHistory();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr('panelYieldCurve', 'YIELD CURVE')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['current', 'history'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t_ === 'current'
              ? tr('yieldCurveCurrent', 'Current Curve')
              : tr('yieldCurveHistory', 'Historical')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {data && tab === 'current' && (
          <CurrentCurveView maturities={data.maturities} updatedAt={data.updatedAt} />
        )}
        {tab === 'history' && (
          <HistoryCurveView historyData={historyData?.curves ?? []} currentData={data?.maturities ?? []} />
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Current Curve View
// ────────────────────────────────────────────────────

function CurrentCurveView({ maturities, updatedAt }: { maturities: YieldPoint[]; updatedAt: string }) {
  const tr = useTr();

  if (maturities.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        {tr('noData', 'No data available')}
      </div>
    );
  }

  // Calculate key spreads
  const findYield = (term: string) => maturities.find((m) => m.term === term)?.yield ?? 0;
  const y2 = findYield('2Y');
  const y3m = findYield('3M');
  const y10 = findYield('10Y');
  const spread2s10s = Math.round((y10 - y2) * 100); // basis points
  const spread3m10y = Math.round((y10 - y3m) * 100);

  // Determine curve shape
  let curveShape = 'NORMAL';
  if (spread2s10s < -20) curveShape = 'INVERTED';
  else if (spread2s10s < 20) curveShape = 'FLAT';

  const shapeColor =
    curveShape === 'INVERTED'
      ? 'text-red-400'
      : curveShape === 'FLAT'
        ? 'text-yellow-400'
        : 'text-emerald-400';

  return (
    <div>
      {/* SVG Chart */}
      <div className="px-3 pt-3 pb-1 border-b border-border/20">
        <YieldCurveChart maturities={maturities} />
      </div>

      {/* Key Metrics Summary */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/20 bg-[#030303]">
        <div className="flex gap-4">
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">2Y/10Y Spread</div>
            <div className={`text-[12px] font-mono font-black ${spread2s10s >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {spread2s10s >= 0 ? '+' : ''}{spread2s10s}bp
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">3M/10Y Spread</div>
            <div className={`text-[12px] font-mono font-black ${spread3m10y >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {spread3m10y >= 0 ? '+' : ''}{spread3m10y}bp
            </div>
          </div>
          <div>
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">Curve Shape</div>
            <div className={`text-[12px] font-mono font-black ${shapeColor}`}>
              {curveShape}
            </div>
          </div>
        </div>
        <div className="text-[7px] font-mono text-neutral/25">
          {new Date(updatedAt).toLocaleTimeString()}
        </div>
      </div>

      {/* Yield Table */}
      <div>
        <div className="grid grid-cols-[1fr_1fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
          <span>{tr('yieldMaturity', 'Maturity')}</span>
          <span className="text-right">{tr('yieldRate', 'Yield')}</span>
          <span className="text-right">{tr('yieldSource', 'Source')}</span>
        </div>

        {maturities.map((m, i) => (
          <div
            key={m.term}
            className={`grid grid-cols-[1fr_1fr_0.6fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-cyan-400/[0.03] ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold text-white">{m.term}</span>
              {m.term === '2Y' || m.term === '10Y' ? (
                <span className="text-[6px] font-mono text-cyan-400/50 uppercase">key</span>
              ) : null}
            </div>
            <span className="text-[10px] font-mono font-bold text-cyan-300 text-right">
              {m.yield.toFixed(3)}%
            </span>
            <span className={`text-[8px] font-mono text-right ${m.isLive ? 'text-emerald-400/60' : 'text-neutral/30'}`}>
              {m.isLive ? 'LIVE' : 'EST'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// SVG Yield Curve Chart
// ────────────────────────────────────────────────────

function YieldCurveChart({ maturities }: { maturities: YieldPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (maturities.length < 2) return null;

    const W = 380;
    const H = 160;
    const PAD_L = 38;
    const PAD_R = 12;
    const PAD_T = 16;
    const PAD_B = 28;

    const yields = maturities.map((m) => m.yield);
    const minY = Math.min(...yields) - 0.15;
    const maxY = Math.max(...yields) + 0.15;

    // Log-ish scale for X axis (maturities are not linearly spaced)
    const monthValues = maturities.map((m) => m.months);
    const maxMonth = Math.max(...monthValues);
    const logScale = (months: number) => Math.log(months + 1) / Math.log(maxMonth + 1);

    const scaleX = (months: number) => PAD_L + logScale(months) * (W - PAD_L - PAD_R);
    const scaleY = (rate: number) => PAD_T + ((maxY - rate) / (maxY - minY)) * (H - PAD_T - PAD_B);

    const points = maturities.map((m) => ({
      x: scaleX(m.months),
      y: scaleY(m.yield),
      data: m,
    }));

    // Build smooth curve path using cardinal spline
    const tension = 0.3;
    let pathD = `M ${points[0].x},${points[0].y}`;

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    // Gradient fill path (close the area under the curve)
    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    // Y-axis grid lines
    const yRange = maxY - minY;
    const yStep = yRange > 2 ? 0.5 : yRange > 1 ? 0.25 : 0.1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY };
  }, [maturities]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * chart.W;

      // Find nearest point
      let nearest = 0;
      let minDist = Infinity;
      for (let i = 0; i < chart.points.length; i++) {
        const d = Math.abs(chart.points[i].x - mouseX);
        if (d < minDist) {
          minDist = d;
          nearest = i;
        }
      }
      setHovered(nearest);
    },
    [chart],
  );

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY } = chart;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 180 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="yc-fill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="yc-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>

      {/* Y-axis grid lines and labels */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={scaleY(v)}
            x2={W - PAD_R}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X-axis baseline */}
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="rgba(255,255,255,0.08)"
      />

      {/* Gradient fill under curve */}
      <path d={fillPath} fill="url(#yc-fill-grad)" />

      {/* Main curve line */}
      <path d={pathD} fill="none" stroke="url(#yc-line-grad)" strokeWidth={2} />

      {/* Data points and X-axis labels */}
      {points.map((p, i) => (
        <g key={i}>
          {/* X-axis label */}
          <text
            x={p.x}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={7}
            fontFamily="monospace"
          >
            {p.data.term}
          </text>

          {/* Tick mark */}
          <line
            x1={p.x}
            y1={H - PAD_B}
            x2={p.x}
            y2={H - PAD_B + 3}
            stroke="rgba(255,255,255,0.15)"
          />

          {/* Data point dot */}
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 4 : p.data.isLive ? 3 : 2}
            fill={hovered === i ? '#22d3ee' : p.data.isLive ? '#06b6d4' : '#0e7490'}
            stroke={hovered === i ? '#fff' : 'none'}
            strokeWidth={1}
          />
        </g>
      ))}

      {/* Hover tooltip */}
      {hovered !== null && points[hovered] && (
        <g>
          {/* Vertical guide line */}
          <line
            x1={points[hovered].x}
            y1={PAD_T}
            x2={points[hovered].x}
            y2={H - PAD_B}
            stroke="rgba(6,182,212,0.3)"
            strokeDasharray="3,3"
          />

          {/* Tooltip background */}
          <rect
            x={Math.min(points[hovered].x - 28, W - PAD_R - 60)}
            y={Math.max(points[hovered].y - 26, PAD_T)}
            width={56}
            height={20}
            rx={2}
            fill="rgba(0,0,0,0.85)"
            stroke="rgba(6,182,212,0.5)"
            strokeWidth={0.5}
          />
          {/* Tooltip text */}
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 32)}
            y={Math.max(points[hovered].y - 13, PAD_T + 13)}
            textAnchor="middle"
            fill="#22d3ee"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {points[hovered].data.term} {points[hovered].data.yield.toFixed(3)}%
          </text>
        </g>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────
// Historical Curve View
// ────────────────────────────────────────────────────

function HistoryCurveView({
  historyData,
  currentData,
}: {
  historyData: HistoricalCurve[];
  currentData: YieldPoint[];
}) {
  const tr = useTr();
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (historyData.length === 0 && currentData.length === 0) {
    return (
      <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
        {tr('loading', 'Loading...')}
      </div>
    );
  }

  // Show the most recent 6 historical curves + current
  const recentCurves = historyData.slice(-6);

  return (
    <div>
      {/* Multi-curve chart */}
      <div className="px-3 pt-3 pb-1 border-b border-border/20">
        <HistoryChart
          curves={recentCurves}
          currentData={currentData}
          selectedIdx={selectedIdx}
        />
      </div>

      {/* Legend / date selector */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral/40 mb-1.5">
          Historical Curves
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedIdx(null)}
            className={`px-2 py-0.5 text-[8px] font-mono border transition-colors ${
              selectedIdx === null
                ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                : 'border-border/30 text-neutral/40 hover:text-neutral'
            }`}
          >
            Current
          </button>
          {recentCurves.map((c, i) => {
            const label = c.date.slice(0, 7); // YYYY-MM
            return (
              <button
                key={c.date}
                onClick={() => setSelectedIdx(selectedIdx === i ? null : i)}
                className={`px-2 py-0.5 text-[8px] font-mono border transition-colors ${
                  selectedIdx === i
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-400/10'
                    : 'border-border/30 text-neutral/40 hover:text-neutral'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected curve detail table */}
      {selectedIdx !== null && recentCurves[selectedIdx] && (
        <div>
          <div className="px-3 py-1 border-b border-border/20 text-[8px] font-mono text-cyan-400/60">
            Curve as of {recentCurves[selectedIdx].date}
          </div>
          <div className="grid grid-cols-[1fr_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
            <span>Maturity</span>
            <span className="text-right">Yield</span>
          </div>
          {recentCurves[selectedIdx].points.map((p, i) => (
            <div
              key={p.term}
              className={`grid grid-cols-[1fr_1fr] px-3 py-1 border-b border-border/10 ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[9px] font-mono text-white">{p.term}</span>
              <span className="text-[9px] font-mono text-cyan-300 text-right">
                {p.yield.toFixed(3)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Historical Multi-Curve Chart
// ────────────────────────────────────────────────────

const HISTORY_COLORS = [
  'rgba(255,255,255,0.08)',
  'rgba(255,255,255,0.12)',
  'rgba(255,255,255,0.16)',
  'rgba(255,255,255,0.22)',
  'rgba(255,255,255,0.30)',
  'rgba(255,255,255,0.40)',
];

function HistoryChart({
  curves,
  currentData,
  selectedIdx,
}: {
  curves: HistoricalCurve[];
  currentData: YieldPoint[];
  selectedIdx: number | null;
}) {
  const chart = useMemo(() => {
    const allYields: number[] = [];
    for (const c of curves) {
      for (const p of c.points) allYields.push(p.yield);
    }
    for (const m of currentData) allYields.push(m.yield);

    if (allYields.length === 0) return null;

    const W = 380;
    const H = 140;
    const PAD_L = 38;
    const PAD_R = 12;
    const PAD_T = 12;
    const PAD_B = 24;

    const minY = Math.min(...allYields) - 0.2;
    const maxY = Math.max(...allYields) + 0.2;

    const refMonths = currentData.length > 0
      ? currentData.map((m) => m.months)
      : curves[0]?.points.map((p) => p.months) ?? [];
    const maxMonth = Math.max(...refMonths, 360);
    const logScale = (months: number) => Math.log(months + 1) / Math.log(maxMonth + 1);

    const scaleX = (months: number) => PAD_L + logScale(months) * (W - PAD_L - PAD_R);
    const scaleY = (rate: number) => PAD_T + ((maxY - rate) / (maxY - minY)) * (H - PAD_T - PAD_B);

    // Y ticks
    const yRange = maxY - minY;
    const yStep = yRange > 2 ? 0.5 : yRange > 1 ? 0.25 : 0.1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    // Build paths for historical curves
    const curvePaths = curves.map((c) => {
      const pts = c.points.map((p) => ({ x: scaleX(p.months), y: scaleY(p.yield) }));
      return pts.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
    });

    // Current curve path (smooth)
    const currentPts = currentData.map((m) => ({ x: scaleX(m.months), y: scaleY(m.yield), data: m }));
    let currentPath = '';
    if (currentPts.length > 1) {
      const tension = 0.3;
      currentPath = `M ${currentPts[0].x},${currentPts[0].y}`;
      for (let i = 0; i < currentPts.length - 1; i++) {
        const p0 = currentPts[Math.max(0, i - 1)];
        const p1 = currentPts[i];
        const p2 = currentPts[i + 1];
        const p3 = currentPts[Math.min(currentPts.length - 1, i + 2)];
        const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
        const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
        const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
        const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
        currentPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
      }
    }

    // X labels from reference maturities
    const xLabels = (currentData.length > 0 ? currentData : curves[0]?.points ?? []).map((p) => ({
      x: scaleX('months' in p ? p.months : 0),
      label: p.term,
    }));

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, yTicks, scaleY, curvePaths, currentPath, currentPts, xLabels };
  }, [curves, currentData]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, yTicks, scaleY, curvePaths, currentPath, currentPts, xLabels } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {/* Y grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={scaleY(v)} x2={W - 12} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4} y={scaleY(v) + 3}
            textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={7} fontFamily="monospace"
          >
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* X baseline */}
      <line x1={PAD_L} y1={H - PAD_B} x2={W - 12} y2={H - PAD_B} stroke="rgba(255,255,255,0.08)" />

      {/* Historical curves (faded) */}
      {curvePaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke={selectedIdx === i ? '#22d3ee' : HISTORY_COLORS[i] ?? 'rgba(255,255,255,0.1)'}
          strokeWidth={selectedIdx === i ? 1.5 : 1}
          strokeDasharray={selectedIdx === i ? undefined : '4,2'}
        />
      ))}

      {/* Current curve (bright) */}
      {currentPath && (
        <path d={currentPath} fill="none" stroke="#06b6d4" strokeWidth={2.5} />
      )}

      {/* Current data points */}
      {currentPts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2} fill="#22d3ee" />
      ))}

      {/* X labels */}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - PAD_B + 12} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={7} fontFamily="monospace">
          {l.label}
        </text>
      ))}
    </svg>
  );
}
