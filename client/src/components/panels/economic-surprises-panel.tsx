import { useEconomicSurprises, type EconomicSurprisesData, type EconomicSurpriseIndicator } from '../../api/hooks/use-economic-surprises';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Color Helpers ──

function getCompositeColor(value: number): string {
  if (value >= 40) return '#22c55e';
  if (value >= 15) return '#4ade80';
  if (value <= -40) return '#ef4444';
  if (value <= -15) return '#f87171';
  return '#a3a3a3';
}

function getLevelLabel(level: EconomicSurprisesData['level']): string {
  switch (level) {
    case 'strong_beat': return 'STRONG BEAT';
    case 'modest_beat': return 'MODEST BEAT';
    case 'neutral': return 'NEUTRAL';
    case 'modest_miss': return 'MODEST MISS';
    case 'strong_miss': return 'STRONG MISS';
  }
}

function getLevelBg(level: EconomicSurprisesData['level']): string {
  switch (level) {
    case 'strong_beat': return 'bg-emerald-500/20 text-emerald-400';
    case 'modest_beat': return 'bg-emerald-500/10 text-emerald-300';
    case 'neutral': return 'bg-neutral-500/10 text-neutral-400';
    case 'modest_miss': return 'bg-red-500/10 text-red-300';
    case 'strong_miss': return 'bg-red-500/20 text-red-400';
  }
}

function getCategoryColor(cat: EconomicSurpriseIndicator['category']): { text: string; bg: string; dot: string } {
  switch (cat) {
    case 'growth': return { text: 'text-blue-400', bg: 'bg-blue-500/15', dot: '#60a5fa' };
    case 'inflation': return { text: 'text-amber-400', bg: 'bg-amber-500/15', dot: '#fbbf24' };
    case 'sentiment': return { text: 'text-purple-400', bg: 'bg-purple-500/15', dot: '#c084fc' };
  }
}

function getSignalColor(signal: EconomicSurpriseIndicator['signal']): string {
  switch (signal) {
    case 'positive': return 'text-emerald-400';
    case 'negative': return 'text-red-400';
    case 'neutral': return 'text-neutral-500';
  }
}

function getZScoreBarColor(z: number): string {
  if (z > 0.5) return '#22c55e';
  if (z < -0.5) return '#ef4444';
  return '#737373';
}

// ── Main Panel ──

export function EconomicSurprisesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEconomicSurprises();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-400" viewBox="0 0 16 16" fill="none">
            <path d="M1 8h2l2-5 2 10 2-7 2 4h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-indigo-400">
            {tr(t, 'esTitle', 'Economic Surprises')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 ${getLevelBg(data.level)}`}>
              {getLevelLabel(data.level)}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'esNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <CompositeHeader data={data} />
            <GaugeSection data={data} />
            <HistoryChart data={data} />
            <IndicatorTable data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Composite Header ──

function CompositeHeader({ data }: { data: EconomicSurprisesData }) {
  const color = getCompositeColor(data.compositeIndex);
  const sign = data.compositeIndex > 0 ? '+' : '';

  return (
    <div className="px-3 pt-3 pb-2 border-b border-border/20" style={{ background: `${color}08` }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            Composite Surprise Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-[24px] font-black font-mono tabular-nums" style={{ color }}>
              {sign}{data.compositeIndex.toFixed(1)}
            </span>
            <span className="text-[8px] font-mono text-neutral-600">/ 100</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Growth</span>
            <span className={`text-[11px] font-bold font-mono tabular-nums ${data.growthIndex >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {data.growthIndex > 0 ? '+' : ''}{data.growthIndex.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Inflation</span>
            <span className={`text-[11px] font-bold font-mono tabular-nums ${data.inflationIndex >= 0 ? 'text-amber-400' : 'text-blue-400'}`}>
              {data.inflationIndex > 0 ? '+' : ''}{data.inflationIndex.toFixed(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Gauge Section (SVG horizontal gauges) ──

function GaugeSection({ data }: { data: EconomicSurprisesData }) {
  const gauges: { label: string; value: number; color: string }[] = [
    { label: 'COMPOSITE', value: data.compositeIndex, color: '#6366f1' },
    { label: 'GROWTH', value: data.growthIndex, color: '#3b82f6' },
    { label: 'INFLATION', value: data.inflationIndex, color: '#f59e0b' },
  ];

  const W = 300;
  const GAUGE_H = 10;
  const PAD = 8;
  const barW = W - PAD * 2;
  const centerX = PAD + barW / 2;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        Surprise Gauges
      </div>
      <svg viewBox={`0 0 ${W} ${gauges.length * 28 + 4}`} className="w-full" style={{ maxHeight: 100 }}>
        {gauges.map((g, i) => {
          const y = i * 28 + 4;
          // Map value (-100 to +100) to bar position
          const pct = (g.value + 100) / 200; // 0 to 1
          const markerX = PAD + pct * barW;

          // Gradient stops for the gauge track
          return (
            <g key={g.label}>
              {/* Label */}
              <text x={PAD} y={y} fill="rgba(255,255,255,0.35)" fontSize={6} fontFamily="monospace" fontWeight="900">
                {g.label}
              </text>

              {/* Value label */}
              <text x={W - PAD} y={y} textAnchor="end" fill={g.value >= 0 ? '#4ade80' : '#f87171'} fontSize={7} fontFamily="monospace" fontWeight="900">
                {g.value > 0 ? '+' : ''}{g.value.toFixed(1)}
              </text>

              {/* Track background */}
              <rect x={PAD} y={y + 4} width={barW} height={GAUGE_H} fill="rgba(255,255,255,0.04)" />

              {/* Red zone (left half) */}
              <rect x={PAD} y={y + 4} width={barW / 2} height={GAUGE_H} fill="rgba(239,68,68,0.08)" />

              {/* Green zone (right half) */}
              <rect x={centerX} y={y + 4} width={barW / 2} height={GAUGE_H} fill="rgba(34,197,94,0.08)" />

              {/* Center line (zero) */}
              <line x1={centerX} y1={y + 3} x2={centerX} y2={y + 4 + GAUGE_H + 1} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />

              {/* Filled portion from center */}
              {g.value !== 0 && (
                <rect
                  x={g.value > 0 ? centerX : markerX}
                  y={y + 4}
                  width={Math.abs(markerX - centerX)}
                  height={GAUGE_H}
                  fill={g.value > 0 ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)'}
                />
              )}

              {/* Marker */}
              <rect x={markerX - 1.5} y={y + 2.5} width={3} height={GAUGE_H + 3} fill={g.color} rx={1} />

              {/* Scale labels */}
              <text x={PAD + 2} y={y + 4 + GAUGE_H + 7} fill="rgba(255,255,255,0.12)" fontSize={5} fontFamily="monospace">-100</text>
              <text x={centerX} y={y + 4 + GAUGE_H + 7} textAnchor="middle" fill="rgba(255,255,255,0.12)" fontSize={5} fontFamily="monospace">0</text>
              <text x={W - PAD - 2} y={y + 4 + GAUGE_H + 7} textAnchor="end" fill="rgba(255,255,255,0.12)" fontSize={5} fontFamily="monospace">+100</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 3. Composite History Chart (SVG area chart) ──

function HistoryChart({ data }: { data: EconomicSurprisesData }) {
  const history = data.history;
  if (history.length < 2) return null;

  const W = 300;
  const H = 100;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 12;
  const PAD_B = 16;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Find min/max across all series
  const allVals = history.flatMap((h) => [h.composite, h.growth, h.inflation]);
  const dataMin = Math.min(...allVals, -10);
  const dataMax = Math.max(...allVals, 10);
  const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax), 20);
  const yMin = -absMax;
  const yMax = absMax;
  const yRange = yMax - yMin;

  function toX(i: number): number {
    return PAD_L + (i / (history.length - 1)) * chartW;
  }

  function toY(val: number): number {
    return PAD_T + (1 - (val - yMin) / yRange) * chartH;
  }

  const zeroY = toY(0);

  // Build composite line path
  const compositePoints = history.map((h, i) => `${toX(i)},${toY(h.composite)}`);
  const compositeLine = `M${compositePoints.join('L')}`;

  // Area fill: split into above/below zero
  const compositeAreaAbove = `M${PAD_L},${zeroY} ` +
    history.map((h, i) => `L${toX(i)},${Math.min(toY(h.composite), zeroY)}`).join(' ') +
    ` L${toX(history.length - 1)},${zeroY} Z`;

  const compositeAreaBelow = `M${PAD_L},${zeroY} ` +
    history.map((h, i) => `L${toX(i)},${Math.max(toY(h.composite), zeroY)}`).join(' ') +
    ` L${toX(history.length - 1)},${zeroY} Z`;

  // Growth line
  const growthLine = `M${history.map((h, i) => `${toX(i)},${toY(h.growth)}`).join('L')}`;
  // Inflation line
  const inflationLine = `M${history.map((h, i) => `${toX(i)},${toY(h.inflation)}`).join('L')}`;

  // Y-axis ticks
  const yTicks = [-absMax, -absMax / 2, 0, absMax / 2, absMax].map((v) => +v.toFixed(0));

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1">
        20-Day Surprise History
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
        {/* Y-axis grid & labels */}
        {yTicks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                stroke={tick === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={tick === 0 ? 0.75 : 0.5}
                strokeDasharray={tick === 0 ? 'none' : '2,2'}
              />
              <text x={PAD_L - 3} y={y + 2.5} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={5.5} fontFamily="monospace">
                {tick > 0 ? '+' : ''}{tick}
              </text>
            </g>
          );
        })}

        {/* Green area (above zero) */}
        <path d={compositeAreaAbove} fill="rgba(34,197,94,0.12)" />

        {/* Red area (below zero) */}
        <path d={compositeAreaBelow} fill="rgba(239,68,68,0.12)" />

        {/* Growth sub-index line */}
        <path d={growthLine} fill="none" stroke="#3b82f6" strokeWidth={0.75} opacity={0.5} />

        {/* Inflation sub-index line */}
        <path d={inflationLine} fill="none" stroke="#f59e0b" strokeWidth={0.75} opacity={0.5} />

        {/* Composite line */}
        <path d={compositeLine} fill="none" stroke="#6366f1" strokeWidth={1.5} />

        {/* End dot */}
        <circle cx={toX(history.length - 1)} cy={toY(history[history.length - 1].composite)} r={2.5} fill="#6366f1" />

        {/* Legend */}
        <rect x={PAD_L + 2} y={2} width={5} height={3} fill="#6366f1" rx={0.5} />
        <text x={PAD_L + 10} y={5} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">Composite</text>

        <rect x={PAD_L + 60} y={2} width={5} height={3} fill="#3b82f6" rx={0.5} opacity={0.5} />
        <text x={PAD_L + 68} y={5} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">Growth</text>

        <rect x={PAD_L + 108} y={2} width={5} height={3} fill="#f59e0b" rx={0.5} opacity={0.5} />
        <text x={PAD_L + 116} y={5} fill="rgba(255,255,255,0.3)" fontSize={5} fontFamily="monospace">Inflation</text>

        {/* X-axis date labels */}
        {[0, Math.floor(history.length / 2), history.length - 1].map((idx) => (
          <text key={idx} x={toX(idx)} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize={5} fontFamily="monospace">
            {history[idx].date.slice(5)}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── 4. Indicator Table ──

function IndicatorTable({ data }: { data: EconomicSurprisesData }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'esIndicators', 'Surprise Indicators')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_70px_42px_40px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Indicator</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Symbol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Z-Score</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Chg%</span>
      </div>

      {/* Rows */}
      {data.indicators.map((ind) => {
        const catColor = getCategoryColor(ind.category);

        return (
          <div
            key={ind.symbol}
            className="grid grid-cols-[1fr_48px_70px_42px_40px] gap-0 px-1 py-[3px] hover:bg-white/[0.02] border-b border-border/10 items-center"
          >
            {/* Name + Category badge */}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{ind.name}</span>
                <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] ${catColor.bg} ${catColor.text}`}>
                  {ind.category.slice(0, 4)}
                </span>
              </div>
              {/* Mini sparkline */}
              <MiniSparkline data={ind.sparkline} color={catColor.dot} />
            </div>

            {/* Symbol */}
            <span className="text-[7px] font-mono text-neutral-500 text-right truncate">{ind.symbol}</span>

            {/* Z-Score bar */}
            <div className="flex items-center gap-1 justify-center">
              <ZScoreBar value={ind.zScore} />
              <span className="text-[7px] font-mono font-bold tabular-nums" style={{ color: getZScoreBarColor(ind.zScore) }}>
                {ind.zScore > 0 ? '+' : ''}{ind.zScore.toFixed(2)}
              </span>
            </div>

            {/* Signal */}
            <span className={`text-[7px] font-mono font-black text-center uppercase ${getSignalColor(ind.signal)}`}>
              {ind.signal === 'positive' ? 'POS' : ind.signal === 'negative' ? 'NEG' : 'NEU'}
            </span>

            {/* Change % */}
            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${ind.changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {ind.changePct > 0 ? '+' : ''}{ind.changePct.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Z-Score Bar (centered at 0) ──

function ZScoreBar({ value }: { value: number }) {
  const W = 32;
  const H = 6;
  const center = W / 2;
  // Map z-score (-3 to +3) to pixel width
  const maxZ = 3;
  const barWidth = (Math.min(Math.abs(value), maxZ) / maxZ) * (W / 2);
  const barColor = getZScoreBarColor(value);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Track */}
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.04)" />
      {/* Center line */}
      <line x1={center} y1={0} x2={center} y2={H} stroke="rgba(255,255,255,0.12)" strokeWidth={0.5} />
      {/* Bar */}
      <rect
        x={value >= 0 ? center : center - barWidth}
        y={0}
        width={barWidth}
        height={H}
        fill={barColor}
        opacity={0.7}
      />
    </svg>
  );
}

// ── Mini Sparkline ──

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;

  const W = 40;
  const H = 8;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - v * H;
    return `${x},${y}`;
  });

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mt-0.5">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={0.75} opacity={0.5} />
    </svg>
  );
}
