import {
  useLiquidity,
  type LiquidityData,
  type LiquidityIndicator,
  type LiquidityHistoryPoint,
  type LiquidityCrossMarket,
} from '../../api/hooks/use-liquidity';
import { useT, tr, TFn } from '../../i18n';
import { Droplets, RefreshCw } from 'lucide-react';

// i18n helper with fallback
// ── Constants ──

const BLUE = '#3b82f6';
const BLUE_LIGHT = '#60a5fa';
const GREEN = '#34d399';
const BRIGHT_GREEN = '#4ade80';
const YELLOW = '#facc15';
const ORANGE = '#fb923c';
const RED = '#f87171';

// ── Color helpers ──

function scoreColor(score: number): string {
  if (score >= 80) return BRIGHT_GREEN;
  if (score >= 60) return GREEN;
  if (score >= 40) return YELLOW;
  if (score >= 20) return ORANGE;
  return RED;
}

function levelBadge(level: LiquidityData['level']): { text: string; color: string; bg: string } {
  switch (level) {
    case 'abundant': return { text: 'ABUNDANT', color: BRIGHT_GREEN, bg: 'rgba(74,222,128,0.15)' };
    case 'normal': return { text: 'NORMAL', color: GREEN, bg: 'rgba(52,211,153,0.12)' };
    case 'tightening': return { text: 'TIGHTENING', color: YELLOW, bg: 'rgba(250,204,21,0.12)' };
    case 'stressed': return { text: 'STRESSED', color: ORANGE, bg: 'rgba(251,146,60,0.15)' };
    case 'crisis': return { text: 'CRISIS', color: RED, bg: 'rgba(248,113,113,0.18)' };
  }
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return GREEN;
    case 'B': return BLUE_LIGHT;
    case 'C': return YELLOW;
    case 'D': return ORANGE;
    case 'F': return RED;
    default: return 'rgba(255,255,255,0.3)';
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case 'A': return 'rgba(52,211,153,0.12)';
    case 'B': return 'rgba(96,165,250,0.12)';
    case 'C': return 'rgba(250,204,21,0.1)';
    case 'D': return 'rgba(251,146,60,0.12)';
    case 'F': return 'rgba(248,113,113,0.15)';
    default: return 'rgba(255,255,255,0.03)';
  }
}

function trendText(trend: string): string {
  switch (trend) {
    case 'rising': return 'RISING';
    case 'falling': return 'FALLING';
    default: return 'STABLE';
  }
}

function trendColor(trend: string): string {
  switch (trend) {
    case 'rising': return GREEN;
    case 'falling': return RED;
    default: return 'rgba(255,255,255,0.3)';
  }
}

// ── Composite Score Gauge (SVG horizontal bar) ──

function CompositeGauge({ score, level }: { score: number; level: LiquidityData['level'] }) {
  const W = 320;
  const H = 50;
  const BAR_Y = 18;
  const BAR_H = 10;
  const BAR_X = 10;
  const BAR_W = W - 20;

  const badge = levelBadge(level);
  const markerX = BAR_X + (score / 100) * BAR_W;

  // Gradient stops
  const stops = [
    { offset: '0%', color: RED },
    { offset: '20%', color: ORANGE },
    { offset: '40%', color: YELLOW },
    { offset: '60%', color: GREEN },
    { offset: '80%', color: BRIGHT_GREEN },
    { offset: '100%', color: BRIGHT_GREEN },
  ];

  return (
    <div className="px-2 py-1.5">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 50 }}>
        <defs>
          <linearGradient id="liqGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} stopOpacity="0.6" />
            ))}
          </linearGradient>
        </defs>

        {/* Background bar */}
        <rect x={BAR_X} y={BAR_Y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.03)" />

        {/* Fill bar */}
        <rect
          x={BAR_X}
          y={BAR_Y}
          width={(score / 100) * BAR_W}
          height={BAR_H}
          fill="url(#liqGaugeGrad)"
        />

        {/* Zone dividers */}
        {[20, 40, 60, 80].map(pct => (
          <line
            key={pct}
            x1={BAR_X + (pct / 100) * BAR_W}
            y1={BAR_Y}
            x2={BAR_X + (pct / 100) * BAR_W}
            y2={BAR_Y + BAR_H}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth={0.5}
          />
        ))}

        {/* Marker line */}
        <line
          x1={markerX}
          y1={BAR_Y - 3}
          x2={markerX}
          y2={BAR_Y + BAR_H + 3}
          stroke="white"
          strokeWidth={1.5}
        />

        {/* Score number */}
        <text
          x={markerX}
          y={BAR_Y - 6}
          textAnchor="middle"
          fill={scoreColor(score)}
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {score}
        </text>

        {/* Labels */}
        <text x={BAR_X} y={BAR_Y + BAR_H + 10} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">CRISIS</text>
        <text x={BAR_X + BAR_W * 0.2} y={BAR_Y + BAR_H + 10} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">STRESSED</text>
        <text x={BAR_X + BAR_W * 0.4} y={BAR_Y + BAR_H + 10} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">TIGHTENING</text>
        <text x={BAR_X + BAR_W * 0.6} y={BAR_Y + BAR_H + 10} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">NORMAL</text>
        <text x={BAR_X + BAR_W * 0.82} y={BAR_Y + BAR_H + 10} fill="rgba(255,255,255,0.2)" fontSize={5} fontFamily="monospace">ABUNDANT</text>
      </svg>
    </div>
  );
}

// ── Cross-Market Liquidity Bars ──

function CrossMarketBars({ crossMarket }: { crossMarket: LiquidityCrossMarket }) {
  const bars: Array<{ label: string; value: number }> = [
    { label: 'EQUITY', value: crossMarket.equityLiquidity },
    { label: 'BOND', value: crossMarket.bondLiquidity },
    { label: 'FX', value: crossMarket.fxLiquidity },
    { label: 'MONEY MKT', value: crossMarket.moneyMarket },
  ];

  const W = 320;
  const H = 56;
  const BAR_X = 60;
  const BAR_W = W - 90;
  const BAR_H = 7;
  const GAP = 14;
  const START_Y = 5;

  return (
    <div className="px-2 py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 56 }}>
        {bars.map((bar, i) => {
          const y = START_Y + i * GAP;
          const fillW = (bar.value / 100) * BAR_W;
          const color = scoreColor(bar.value);

          return (
            <g key={bar.label}>
              {/* Label */}
              <text
                x={BAR_X - 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="end"
                fill="rgba(255,255,255,0.4)"
                fontSize={5.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {bar.label}
              </text>

              {/* Background */}
              <rect x={BAR_X} y={y} width={BAR_W} height={BAR_H} fill="rgba(255,255,255,0.02)" />

              {/* Fill */}
              <rect x={BAR_X} y={y} width={fillW} height={BAR_H} fill={color} fillOpacity={0.5} />

              {/* Value */}
              <text
                x={BAR_X + BAR_W + 4}
                y={y + BAR_H / 2 + 1.5}
                textAnchor="start"
                fill={color}
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {bar.value}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 20-Day Composite History Chart ──

function HistoryChart({ history }: { history: LiquidityHistoryPoint[] }) {
  if (history.length < 2) return null;

  const W = 320;
  const H = 80;
  const PAD_L = 22;
  const PAD_R = 5;
  const PAD_T = 8;
  const PAD_B = 14;
  const CHART_W = W - PAD_L - PAD_R;
  const CHART_H = H - PAD_T - PAD_B;

  const xScale = (i: number) => PAD_L + (i / (history.length - 1)) * CHART_W;
  const yScale = (v: number) => PAD_T + CHART_H - (v / 100) * CHART_H;

  // Build paths
  const compositePath = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.composite).toFixed(1)}`).join(' ');
  const equityPath = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.equity).toFixed(1)}`).join(' ');
  const bondPath = history.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.bond).toFixed(1)}`).join(' ');

  // Zone bands
  const zones = [
    { y1: 0, y2: 20, color: RED, opacity: 0.04 },
    { y1: 20, y2: 40, color: ORANGE, opacity: 0.03 },
    { y1: 40, y2: 60, color: YELLOW, opacity: 0.02 },
    { y1: 60, y2: 80, color: GREEN, opacity: 0.02 },
    { y1: 80, y2: 100, color: BRIGHT_GREEN, opacity: 0.03 },
  ];

  return (
    <div className="px-2 py-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 80 }}>
        {/* Zone bands */}
        {zones.map((z, i) => (
          <rect
            key={i}
            x={PAD_L}
            y={yScale(z.y2)}
            width={CHART_W}
            height={yScale(z.y1) - yScale(z.y2)}
            fill={z.color}
            fillOpacity={z.opacity}
          />
        ))}

        {/* Grid lines */}
        {[20, 40, 60, 80].map(v => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={yScale(v)}
              x2={PAD_L + CHART_W}
              y2={yScale(v)}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={0.5}
              strokeDasharray="2,2"
            />
            <text
              x={PAD_L - 3}
              y={yScale(v) + 1.5}
              textAnchor="end"
              fill="rgba(255,255,255,0.15)"
              fontSize={4.5}
              fontFamily="monospace"
            >
              {v}
            </text>
          </g>
        ))}

        {/* Bond line */}
        <path d={bondPath} fill="none" stroke={ORANGE} strokeWidth={0.7} strokeOpacity={0.4} />
        {/* Equity line */}
        <path d={equityPath} fill="none" stroke={GREEN} strokeWidth={0.7} strokeOpacity={0.5} />
        {/* Composite line */}
        <path d={compositePath} fill="none" stroke={BLUE} strokeWidth={1.2} strokeOpacity={0.8} />

        {/* Endpoint dots */}
        {history.length > 0 && (
          <>
            <circle cx={xScale(history.length - 1)} cy={yScale(history[history.length - 1].composite)} r={2} fill={BLUE} />
            <circle cx={xScale(history.length - 1)} cy={yScale(history[history.length - 1].equity)} r={1.5} fill={GREEN} fillOpacity={0.6} />
            <circle cx={xScale(history.length - 1)} cy={yScale(history[history.length - 1].bond)} r={1.5} fill={ORANGE} fillOpacity={0.5} />
          </>
        )}

        {/* Legend */}
        <rect x={PAD_L + 2} y={H - 10} width={6} height={2} fill={BLUE} fillOpacity={0.8} />
        <text x={PAD_L + 10} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">COMPOSITE</text>
        <rect x={PAD_L + 52} y={H - 10} width={6} height={2} fill={GREEN} fillOpacity={0.5} />
        <text x={PAD_L + 60} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">EQUITY</text>
        <rect x={PAD_L + 92} y={H - 10} width={6} height={2} fill={ORANGE} fillOpacity={0.4} />
        <text x={PAD_L + 100} y={H - 8} fill="rgba(255,255,255,0.3)" fontSize={4} fontFamily="monospace">BOND</text>

        {/* Date labels */}
        {history.length > 0 && (
          <>
            <text x={PAD_L} y={H - 2} fill="rgba(255,255,255,0.12)" fontSize={4} fontFamily="monospace">
              {history[0].date.slice(5)}
            </text>
            <text x={PAD_L + CHART_W} y={H - 2} textAnchor="end" fill="rgba(255,255,255,0.12)" fontSize={4} fontFamily="monospace">
              {history[history.length - 1].date.slice(5)}
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

// ── Volume Sparkline (bar chart) ──

function VolumeSparkline({ data, width = 52, height = 12 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const maxVal = Math.max(...data, 0.01);
  const stepX = width / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      {/* Avg line at ratio = 1.0 */}
      {maxVal > 1 && (
        <line
          x1={0}
          y1={height - (1 / maxVal) * height}
          x2={width}
          y2={height - (1 / maxVal) * height}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />
      )}
      {data.map((v, i) => {
        const barH = Math.max((v / maxVal) * height, 0.3);
        const x = i * stepX;
        const y = height - barH;
        const isAboveAvg = v >= 1.0;
        const color = isAboveAvg ? 'rgba(52,211,153,0.5)' : 'rgba(248,113,113,0.4)';
        return <rect key={i} x={x + stepX * 0.1} y={y} width={stepX * 0.8} height={barH} fill={color} />;
      })}
    </svg>
  );
}

// ── Indicator Table ──

function IndicatorTable({ indicators, level }: { indicators: LiquidityIndicator[]; level: LiquidityData['level'] }) {
  // Sort: worst first when stressed/crisis, best first when normal/abundant
  const isStressed = level === 'stressed' || level === 'crisis' || level === 'tightening';
  const gradeOrder: Record<string, number> = { F: 0, D: 1, C: 2, B: 3, A: 4 };

  const sorted = [...indicators].sort((a, b) => {
    const aOrd = gradeOrder[a.liquidityGrade] ?? 2;
    const bOrd = gradeOrder[b.liquidityGrade] ?? 2;
    return isStressed ? aOrd - bOrd : bOrd - aOrd;
  });

  return (
    <div className="px-1">
      {/* Header */}
      <div className="flex items-center py-0.5 px-1 border-b border-white/[0.06] text-[5px] font-mono text-white/20 uppercase gap-1">
        <span className="w-[52px] shrink-0">NAME</span>
        <span className="w-[36px] shrink-0">SYM</span>
        <span className="w-[28px] text-right shrink-0">VOL R</span>
        <span className="w-[28px] text-right shrink-0">SPRD</span>
        <span className="w-[28px] text-right shrink-0">VOL5D</span>
        <span className="w-[16px] text-center shrink-0">GR</span>
        <span className="w-[52px] text-right shrink-0">VOL SPARK</span>
      </div>

      {sorted.map(ind => (
        <div
          key={ind.symbol}
          className="flex items-center py-0.5 px-1 border-b border-white/[0.02] text-[7px] font-mono gap-1"
        >
          {/* Name */}
          <span className="w-[52px] text-white/35 truncate shrink-0 text-[6px]">{ind.name}</span>

          {/* Symbol */}
          <span className="w-[36px] font-bold text-white/60 shrink-0">{ind.symbol}</span>

          {/* Volume ratio */}
          <span
            className="w-[28px] text-right font-bold shrink-0"
            style={{ color: ind.volumeRatio >= 1.0 ? GREEN : ind.volumeRatio >= 0.6 ? YELLOW : RED }}
          >
            {ind.volumeRatio.toFixed(2)}
          </span>

          {/* Spread proxy */}
          <span
            className="w-[28px] text-right shrink-0"
            style={{ color: ind.spreadProxy < 0.01 ? GREEN : ind.spreadProxy < 0.02 ? YELLOW : RED }}
          >
            {(ind.spreadProxy * 100).toFixed(2)}
          </span>

          {/* Realized vol 5d */}
          <span
            className="w-[28px] text-right shrink-0"
            style={{ color: ind.realizedVol5d < 15 ? GREEN : ind.realizedVol5d < 30 ? YELLOW : RED }}
          >
            {ind.realizedVol5d.toFixed(1)}
          </span>

          {/* Grade badge */}
          <span
            className="w-[16px] text-center font-black shrink-0 text-[6px]"
            style={{ color: gradeColor(ind.liquidityGrade), backgroundColor: gradeBg(ind.liquidityGrade) }}
          >
            {ind.liquidityGrade}
          </span>

          {/* Sparkline */}
          <div className="w-[52px] shrink-0 flex justify-end">
            <VolumeSparkline data={ind.sparklineVolume} width={48} height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Alerts ──

function AlertsSection({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="px-2 py-1 border-t border-white/[0.06]">
      <div className="text-[5px] font-mono text-white/20 uppercase tracking-wider mb-0.5">ALERTS</div>
      {alerts.map((alert, i) => (
        <div
          key={i}
          className="flex items-start gap-1 py-0.5 text-[7px] font-mono"
        >
          <span
            className="shrink-0 mt-0.5 w-1 h-1 inline-block"
            style={{ backgroundColor: alert.startsWith('CRITICAL') ? RED : alert.startsWith('WARNING') ? ORANGE : YELLOW }}
          />
          <span style={{ color: alert.startsWith('CRITICAL') ? RED : alert.startsWith('WARNING') ? ORANGE : 'rgba(255,255,255,0.45)' }}>
            {alert}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function LiquidityPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useLiquidity();

  const badge = data ? levelBadge(data.level) : null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4" style={{ color: BLUE }} />
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: BLUE }}>
            {tr(t, 'liqTitle', 'Liquidity Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {badge && (
            <span
              className="text-[5px] font-black uppercase px-1 py-0.5"
              style={{ color: badge.color, backgroundColor: badge.bg }}
            >
              {badge.text}
            </span>
          )}
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-blue-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {/* Composite Score Gauge */}
            <div className="border-b border-white/[0.06]">
              <div className="px-2 pt-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'liqComposite', 'Composite Liquidity Score')}
                </span>
              </div>
              <CompositeGauge score={data.compositeScore} level={data.level} />
            </div>

            {/* Cross-Market Bars */}
            <div className="border-b border-white/[0.06]">
              <div className="px-2 pt-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'liqCrossMarket', 'Cross-Market Liquidity')}
                </span>
              </div>
              <CrossMarketBars crossMarket={data.crossMarket} />
            </div>

            {/* History Chart */}
            <div className="border-b border-white/[0.06]">
              <div className="px-2 pt-1">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'liqHistory', '20-Day Composite History')}
                </span>
              </div>
              <HistoryChart history={data.history} />
            </div>

            {/* Indicator Table */}
            <div className="border-b border-white/[0.06]">
              <div className="px-2 pt-1 pb-0.5">
                <span className="text-[6px] text-white/25 uppercase tracking-wider">
                  {tr(t, 'liqIndicators', 'Liquidity Indicators')}
                </span>
              </div>
              <IndicatorTable indicators={data.indicators} level={data.level} />
            </div>

            {/* Alerts */}
            <AlertsSection alerts={data.alerts} />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            {tr(t, 'liqNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
