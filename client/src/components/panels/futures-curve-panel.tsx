import { useState, useMemo, useCallback } from 'react';
import {
  useFuturesCurve,
  type CurvePoint,
  type SpreadEntry,
} from '../../api/hooks/use-futures-curve';
import { useT } from '../../i18n';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

type CommodityKey = 'crude' | 'gold' | 'silver' | 'natgas' | 'copper' | 'corn' | 'wheat' | 'soybeans';

const COMMODITIES: { key: CommodityKey; label: string }[] = [
  { key: 'crude', label: 'Crude Oil' },
  { key: 'gold', label: 'Gold' },
  { key: 'silver', label: 'Silver' },
  { key: 'natgas', label: 'Nat Gas' },
  { key: 'copper', label: 'Copper' },
  { key: 'corn', label: 'Corn' },
  { key: 'wheat', label: 'Wheat' },
  { key: 'soybeans', label: 'Soybeans' },
];

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

// ────────────────────────────────────────────────────
// Main Panel
// ────────────────────────────────────────────────────

export function FuturesCurvePanel() {
  const tr = useTr();
  const [commodity, setCommodity] = useState<CommodityKey>('crude');
  const { data, isLoading, refetch } = useFuturesCurve(commodity);

  const shapeIcon = useMemo(() => {
    if (!data) return null;
    if (data.shape === 'contango') return <TrendingUp className="w-3 h-3" />;
    if (data.shape === 'backwardation') return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  }, [data]);

  const shapeColor = useMemo(() => {
    if (!data) return 'text-neutral/40';
    switch (data.shape) {
      case 'contango': return 'text-orange-400';
      case 'backwardation': return 'text-emerald-400';
      case 'mixed': return 'text-yellow-400';
      default: return 'text-neutral/40';
    }
  }, [data]);

  const shapeBgColor = useMemo(() => {
    if (!data) return 'bg-neutral/5';
    switch (data.shape) {
      case 'contango': return 'bg-orange-500/10';
      case 'backwardation': return 'bg-emerald-500/10';
      case 'mixed': return 'bg-yellow-500/10';
      default: return 'bg-neutral/5';
    }
  }, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr('panelFuturesCurve', 'FUTURES CURVE')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Commodity selector + badges */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 bg-[#030303] shrink-0 flex-wrap">
        <select
          value={commodity}
          onChange={(e) => setCommodity(e.target.value as CommodityKey)}
          className="bg-black border border-border/30 text-[9px] font-mono text-white px-2 py-1 focus:outline-none focus:border-orange-400/50"
        >
          {COMMODITIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        {/* Spot price badge */}
        {data?.spotPrice != null && (
          <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/30 px-2 py-0.5">
            <span className="text-[8px] font-mono text-orange-400/60 uppercase">
              {tr('futuresCurveSpot', 'Spot')}
            </span>
            <span className="text-[10px] font-mono font-bold text-orange-300">
              {data.spotPrice.toFixed(2)}
            </span>
            {data.spotChangePct != null && (
              <span className={`text-[8px] font-mono ${data.spotChangePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.spotChangePct >= 0 ? '+' : ''}{data.spotChangePct.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        {/* Curve shape badge */}
        {data && (
          <div className={`flex items-center gap-1 ${shapeBgColor} border border-border/20 px-2 py-0.5`}>
            <span className={shapeColor}>{shapeIcon}</span>
            <span className={`text-[8px] font-mono font-bold uppercase ${shapeColor}`}>
              {data.shape}
            </span>
          </div>
        )}

        {/* Front-back spread */}
        {data?.frontBackSpread != null && (
          <div className="flex items-center gap-1 bg-white/[0.02] border border-border/20 px-2 py-0.5">
            <span className="text-[7px] font-mono text-neutral/40 uppercase">
              {tr('futuresCurveSpread', 'F/B Spread')}
            </span>
            <span className={`text-[9px] font-mono font-bold ${data.frontBackSpread >= 0 ? 'text-orange-300' : 'text-emerald-300'}`}>
              {data.frontBackSpread >= 0 ? '+' : ''}{data.frontBackSpread.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {data && data.curve.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr('noData', 'No curve data available')}
          </div>
        )}

        {data && data.curve.length > 0 && (
          <>
            {/* Term Structure Chart */}
            <div className="px-3 pt-3 pb-1 border-b border-border/20">
              <TermStructureChart
                curve={data.curve}
                spotPrice={data.spotPrice}
                shape={data.shape}
              />
            </div>

            {/* Spread Bar Chart */}
            {data.spreads.length > 0 && (
              <div className="px-3 pt-2 pb-1 border-b border-border/20">
                <div className="text-[7px] font-black uppercase tracking-widest text-neutral/40 mb-1">
                  {tr('futuresCurveMoMSpread', 'Month-to-Month Spreads')}
                </div>
                <SpreadChart spreads={data.spreads} />
              </div>
            )}

            {/* Contract Table */}
            <div>
              <div className="grid grid-cols-[1.2fr_1.1fr_0.8fr_0.7fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
                <span>{tr('futuresCurveMonth', 'Month')}</span>
                <span className="text-right">{tr('futuresCurvePrice', 'Price')}</span>
                <span className="text-right">{tr('futuresCurveChange', 'Chg%')}</span>
                <span className="text-right">{tr('futuresCurveDays', 'Days')}</span>
                <span className="text-right">{tr('futuresCurveVsSpot', 'vs Spot')}</span>
              </div>

              {data.curve.map((pt, i) => {
                const vsSpot = data.spotPrice != null
                  ? Math.round((pt.price - data.spotPrice) * 100) / 100
                  : null;
                const vsSpotPct = data.spotPrice != null && data.spotPrice > 0
                  ? ((pt.price - data.spotPrice) / data.spotPrice) * 100
                  : null;

                return (
                  <div
                    key={pt.symbol}
                    className={`grid grid-cols-[1.2fr_1.1fr_0.8fr_0.7fr_0.8fr] px-3 py-1.5 border-b border-border/10 transition-colors hover:bg-orange-400/[0.03] ${
                      i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono font-bold text-white">{pt.month}</span>
                      <span className="text-[7px] font-mono text-neutral/30">{pt.symbol}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-orange-300 text-right self-center">
                      {pt.price.toFixed(2)}
                    </span>
                    <span className={`text-[9px] font-mono text-right self-center ${
                      pt.changePct != null
                        ? pt.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'
                        : 'text-neutral/30'
                    }`}>
                      {pt.changePct != null ? `${pt.changePct >= 0 ? '+' : ''}${pt.changePct.toFixed(2)}%` : '-'}
                    </span>
                    <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
                      {pt.daysToExpiry}d
                    </span>
                    <div className="text-right self-center">
                      {vsSpot != null && vsSpotPct != null ? (
                        <div className="flex flex-col items-end">
                          <span className={`text-[9px] font-mono font-bold ${vsSpot >= 0 ? 'text-orange-300/70' : 'text-emerald-300/70'}`}>
                            {vsSpot >= 0 ? '+' : ''}{vsSpot.toFixed(2)}
                          </span>
                          <span className={`text-[7px] font-mono ${vsSpotPct >= 0 ? 'text-orange-400/40' : 'text-emerald-400/40'}`}>
                            {vsSpotPct >= 0 ? '+' : ''}{vsSpotPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-mono text-neutral/30">-</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Updated timestamp */}
            <div className="px-3 py-1.5 text-[7px] font-mono text-neutral/25 text-right">
              {new Date(data.updatedAt).toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Term Structure SVG Chart
// ────────────────────────────────────────────────────

function TermStructureChart({
  curve,
  spotPrice,
  shape,
}: {
  curve: CurvePoint[];
  spotPrice: number | null;
  shape: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  const chart = useMemo(() => {
    if (curve.length < 2) return null;

    const W = 400;
    const H = 170;
    const PAD_L = 44;
    const PAD_R = 14;
    const PAD_T = 18;
    const PAD_B = 30;

    const prices = curve.map((c) => c.price);
    const allPrices = spotPrice != null ? [spotPrice, ...prices] : prices;
    const minP = Math.min(...allPrices);
    const maxP = Math.max(...allPrices);
    const padding = (maxP - minP) * 0.12 || 1;
    const yMin = minP - padding;
    const yMax = maxP + padding;

    const scaleX = (i: number) => PAD_L + (i / (curve.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (price: number) => PAD_T + ((yMax - price) / (yMax - yMin)) * (H - PAD_T - PAD_B);

    // Build data points
    const points = curve.map((c, i) => ({
      x: scaleX(i),
      y: scaleY(c.price),
      data: c,
    }));

    // Smooth curve path (cardinal spline)
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

    // Fill path (area under curve)
    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    // Y-axis ticks
    const yRange = yMax - yMin;
    const rawStep = yRange / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / mag;
    let yStep: number;
    if (normalized <= 1.5) yStep = mag;
    else if (normalized <= 3.5) yStep = 2 * mag;
    else if (normalized <= 7.5) yStep = 5 * mag;
    else yStep = 10 * mag;

    const yTicks: number[] = [];
    for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) {
      yTicks.push(Math.round(v * 100) / 100);
    }

    // Spot price line Y position
    const spotY = spotPrice != null ? scaleY(spotPrice) : null;

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY, spotY };
  }, [curve, spotPrice]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!chart) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * chart.W;

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

  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY, spotY } = chart;

  const gradientId = shape === 'backwardation' ? 'fc-fill-green' : 'fc-fill-orange';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 190 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id="fc-fill-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#f97316" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="fc-fill-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="fc-line-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="50%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#ea580c" />
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

      {/* Spot price reference line */}
      {spotY != null && spotY >= PAD_T && spotY <= H - PAD_B && (
        <g>
          <line
            x1={PAD_L}
            y1={spotY}
            x2={W - PAD_R}
            y2={spotY}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="4,3"
          />
          <text
            x={W - PAD_R + 2}
            y={spotY + 3}
            fill="rgba(249,115,22,0.5)"
            fontSize={6}
            fontFamily="monospace"
          >
            SPOT
          </text>
        </g>
      )}

      {/* Gradient fill under curve */}
      <path d={fillPath} fill={`url(#${gradientId})`} />

      {/* Main curve line */}
      <path d={pathD} fill="none" stroke="url(#fc-line-grad)" strokeWidth={2} />

      {/* Data points and X-axis labels */}
      {points.map((p, i) => {
        const label = p.data.month.split(' ')[0]; // Just the month abbreviation
        return (
          <g key={i}>
            {/* X-axis label */}
            <text
              x={p.x}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={6.5}
              fontFamily="monospace"
            >
              {label}
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
              r={hovered === i ? 4 : 2.5}
              fill={hovered === i ? '#fb923c' : '#f97316'}
              stroke={hovered === i ? '#fff' : 'none'}
              strokeWidth={1}
            />

            {/* Price label on point (only for first, last, and hovered) */}
            {(i === 0 || i === points.length - 1) && hovered !== i && (
              <text
                x={p.x}
                y={p.y - 7}
                textAnchor="middle"
                fill="rgba(251,146,60,0.6)"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {p.data.price.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hovered !== null && points[hovered] && (
        <g>
          {/* Vertical guide line */}
          <line
            x1={points[hovered].x}
            y1={PAD_T}
            x2={points[hovered].x}
            y2={H - PAD_B}
            stroke="rgba(249,115,22,0.3)"
            strokeDasharray="3,3"
          />

          {/* Tooltip background */}
          <rect
            x={Math.min(points[hovered].x - 36, W - PAD_R - 76)}
            y={Math.max(points[hovered].y - 30, PAD_T)}
            width={72}
            height={24}
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(249,115,22,0.5)"
            strokeWidth={0.5}
          />
          {/* Tooltip text */}
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 15, PAD_T + 11)}
            textAnchor="middle"
            fill="#fb923c"
            fontSize={8}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {points[hovered].data.month}
          </text>
          <text
            x={Math.min(points[hovered].x, W - PAD_R - 40)}
            y={Math.max(points[hovered].y - 6, PAD_T + 20)}
            textAnchor="middle"
            fill="#fdba74"
            fontSize={9}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {points[hovered].data.price.toFixed(2)}
          </text>
        </g>
      )}
    </svg>
  );
}

// ────────────────────────────────────────────────────
// Spread Bar Chart (SVG)
// ────────────────────────────────────────────────────

function SpreadChart({ spreads }: { spreads: SpreadEntry[] }) {
  const chart = useMemo(() => {
    if (spreads.length === 0) return null;

    const W = 400;
    const H = 80;
    const PAD_L = 44;
    const PAD_R = 14;
    const PAD_T = 8;
    const PAD_B = 18;

    const values = spreads.map((s) => s.spread);
    const maxAbs = Math.max(...values.map(Math.abs), 0.01);

    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const barW = Math.min(chartW / spreads.length - 2, 20);
    const zeroY = PAD_T + chartH / 2;

    const bars = spreads.map((s, i) => {
      const x = PAD_L + (i + 0.5) * (chartW / spreads.length) - barW / 2;
      const barHeight = Math.abs(s.spread) / maxAbs * (chartH / 2);
      const y = s.spread >= 0 ? zeroY - barHeight : zeroY;
      const isPositive = s.spread >= 0;

      return { x, y, w: barW, h: barHeight, isPositive, data: s };
    });

    return { W, H, PAD_L, PAD_R, PAD_B, zeroY, bars, chartW };
  }, [spreads]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, zeroY, bars, chartW } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 90 }}>
      {/* Zero line */}
      <line
        x1={PAD_L}
        y1={zeroY}
        x2={W - PAD_R}
        y2={zeroY}
        stroke="rgba(255,255,255,0.1)"
      />

      {/* Bars */}
      {bars.map((bar, i) => (
        <g key={i}>
          <rect
            x={bar.x}
            y={bar.y}
            width={bar.w}
            height={Math.max(bar.h, 1)}
            fill={bar.isPositive ? 'rgba(249,115,22,0.6)' : 'rgba(239,68,68,0.6)'}
          />
          {/* Label */}
          <text
            x={bar.x + bar.w / 2}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={5.5}
            fontFamily="monospace"
          >
            {bar.data.pair.length > 7 ? bar.data.pair.slice(0, 7) : bar.data.pair}
          </text>
          {/* Value on bar */}
          <text
            x={bar.x + bar.w / 2}
            y={bar.isPositive ? bar.y - 2 : bar.y + bar.h + 8}
            textAnchor="middle"
            fill={bar.isPositive ? 'rgba(251,146,60,0.7)' : 'rgba(239,68,68,0.7)'}
            fontSize={6}
            fontFamily="monospace"
          >
            {bar.data.spread >= 0 ? '+' : ''}{bar.data.spread.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Legend labels */}
      <text x={PAD_L - 4} y={zeroY - 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        +
      </text>
      <text x={PAD_L - 4} y={zeroY + 10} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        -
      </text>
    </svg>
  );
}
