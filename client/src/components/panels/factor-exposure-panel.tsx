import { useMemo } from 'react';
import {
  useFactorExposure,
  type FactorExposureData,
  type Factor,
  type FactorSignal,
  type RegimeStyle,
} from '../../api/hooks/use-factor-exposure';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Color Helpers ──

const ACCENT = '#84cc16'; // lime-400

function getSignalColor(signal: FactorSignal): { bg: string; text: string; label: string } {
  switch (signal) {
    case 'strong_buy': return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e', label: 'STR BUY' };
    case 'buy': return { bg: 'rgba(132,204,22,0.2)', text: '#84cc16', label: 'BUY' };
    case 'neutral': return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa', label: 'NEUTRAL' };
    case 'sell': return { bg: 'rgba(249,115,22,0.2)', text: '#f97316', label: 'SELL' };
    case 'strong_sell': return { bg: 'rgba(239,68,68,0.2)', text: '#ef4444', label: 'STR SELL' };
  }
}

function getStyleColor(style: RegimeStyle): { bg: string; text: string } {
  switch (style) {
    case 'value': return { bg: 'rgba(59,130,246,0.2)', text: '#60a5fa' };
    case 'growth': return { bg: 'rgba(168,85,247,0.2)', text: '#c084fc' };
    case 'quality': return { bg: 'rgba(34,197,94,0.2)', text: '#22c55e' };
    case 'momentum': return { bg: 'rgba(251,191,36,0.2)', text: '#fbbf24' };
    case 'mixed': return { bg: 'rgba(161,161,170,0.15)', text: '#a1a1aa' };
  }
}

function getReturnColor(ret: number): string {
  if (ret > 0) return '#22c55e';
  if (ret < 0) return '#ef4444';
  return '#71717a';
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals: number = 2): string {
  return n.toFixed(decimals);
}

// ── Heatmap color for correlation ──

function corrColor(v: number): string {
  // Blue (negative) -> dark (zero) -> Red (positive)
  if (v > 0) {
    const intensity = Math.min(v, 1);
    return `rgba(239,68,68,${0.1 + intensity * 0.6})`;
  }
  if (v < 0) {
    const intensity = Math.min(Math.abs(v), 1);
    return `rgba(59,130,246,${0.1 + intensity * 0.6})`;
  }
  return 'rgba(255,255,255,0.03)';
}

function corrTextColor(v: number): string {
  const abs = Math.abs(v);
  if (abs > 0.6) return '#ffffff';
  if (abs > 0.3) return '#d4d4d8';
  return '#71717a';
}

// ── Main Panel ──

export function FactorExposurePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useFactorExposure();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="10" width="3" height="5" fill={ACCENT} opacity="0.7" />
            <rect x="5" y="6" width="3" height="9" fill={ACCENT} opacity="0.85" />
            <rect x="9" y="3" width="3" height="12" fill={ACCENT} />
            <rect x="13" y="1" width="2" height="14" fill={ACCENT} opacity="0.6" />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'feTitle', 'Factor Exposure')}
          </span>
          {data?.regime && (
            <span
              className="text-[7px] font-mono font-black uppercase px-1.5 py-[1px]"
              style={{
                background: getStyleColor(data.regime.style).bg,
                color: getStyleColor(data.regime.style).text,
              }}
            >
              {data.regime.style}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-lime-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div
            className="text-center py-8 text-[9px] font-mono uppercase animate-pulse"
            style={{ color: ACCENT }}
          >
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'feNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <FactorPerformanceBars factors={data.factors} />
            <FactorMetricsTable factors={data.factors} />
            <FactorCorrelationHeatmap data={data} />
            <RegimeDescription data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Factor Performance Bars (SVG) ──

function FactorPerformanceBars({ factors }: { factors: Factor[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...factors].sort((a, b) => Math.abs(b.return20d) - Math.abs(a.return20d)),
    [factors],
  );

  const maxAbs = useMemo(
    () => Math.max(...sorted.map((f) => Math.abs(f.return20d)), 0.01),
    [sorted],
  );

  const ROW_H = 18;
  const PAD_LEFT = 90;
  const PAD_RIGHT = 55;
  const W = 360;
  const CENTER_X = PAD_LEFT + (W - PAD_LEFT - PAD_RIGHT) / 2;
  const BAR_HALF = (W - PAD_LEFT - PAD_RIGHT) / 2;
  const H = sorted.length * ROW_H + 8;

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1 px-1">
        {tr(t, 'fe20dReturn', '20-Day Factor Returns')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: sorted.length * 22 }}>
        {/* Center line */}
        <line
          x1={CENTER_X}
          y1={0}
          x2={CENTER_X}
          y2={H}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />

        {sorted.map((factor, i) => {
          const y = i * ROW_H + 4;
          const barWidth = (Math.abs(factor.return20d) / maxAbs) * BAR_HALF;
          const isPositive = factor.return20d >= 0;
          const barX = isPositive ? CENTER_X : CENTER_X - barWidth;
          const barColor = getReturnColor(factor.return20d);

          return (
            <g key={factor.name}>
              {/* Row background on hover */}
              <rect x={0} y={y - 1} width={W} height={ROW_H} fill="transparent" />

              {/* Factor name */}
              <text
                x={PAD_LEFT - 4}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fill="#a1a1aa"
                fontSize={7.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {factor.name}
              </text>

              {/* Bar */}
              <rect
                x={barX}
                y={y + 3}
                width={Math.max(barWidth, 1)}
                height={ROW_H - 7}
                fill={barColor}
                opacity={0.7}
              />

              {/* Return label */}
              <text
                x={W - PAD_RIGHT + 4}
                y={y + ROW_H / 2}
                textAnchor="start"
                dominantBaseline="middle"
                fill={barColor}
                fontSize={7.5}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {fmtPct(factor.return20d)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 2. Factor Metrics Table ──

function FactorMetricsTable({ factors }: { factors: Factor[] }) {
  const t = useT();

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'feMetrics', 'Factor Metrics')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_36px_36px_36px_30px_34px_44px_46px_44px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Factor</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">5D</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">20D</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">60D</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Vol</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Sharpe</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Z-Score</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Trend</span>
      </div>

      {/* Rows */}
      {factors.map((factor) => {
        const sigColor = getSignalColor(factor.signal);
        return (
          <div
            key={factor.name}
            className="grid grid-cols-[1fr_36px_36px_36px_30px_34px_44px_46px_44px] gap-0 px-1 py-[3px] hover:bg-white/[0.02] border-b border-border/10 items-center"
          >
            {/* Factor name */}
            <div className="flex flex-col min-w-0">
              <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
                {factor.name}
              </span>
              <span className="text-[6px] font-mono text-neutral-600 truncate">
                {factor.symbol}
                {factor.pairSymbol ? `/${factor.pairSymbol}` : ''}
              </span>
            </div>

            {/* 5D */}
            <span
              className="text-[7px] font-mono font-bold text-right tabular-nums"
              style={{ color: getReturnColor(factor.return5d) }}
            >
              {fmtPct(factor.return5d)}
            </span>

            {/* 20D */}
            <span
              className="text-[7px] font-mono font-bold text-right tabular-nums"
              style={{ color: getReturnColor(factor.return20d) }}
            >
              {fmtPct(factor.return20d)}
            </span>

            {/* 60D */}
            <span
              className="text-[7px] font-mono font-bold text-right tabular-nums"
              style={{ color: getReturnColor(factor.return60d) }}
            >
              {fmtPct(factor.return60d)}
            </span>

            {/* Vol */}
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(factor.volatility20d, 1)}
            </span>

            {/* Sharpe */}
            <span
              className="text-[7px] font-mono font-bold text-right tabular-nums"
              style={{ color: factor.sharpe20d > 0 ? '#22c55e' : factor.sharpe20d < 0 ? '#ef4444' : '#71717a' }}
            >
              {fmtNum(factor.sharpe20d)}
            </span>

            {/* Z-Score bar */}
            <div className="flex items-center justify-center">
              <ZScoreBar value={factor.zScore} />
            </div>

            {/* Signal badge */}
            <div className="flex justify-center">
              <span
                className="text-[6px] font-mono font-black uppercase px-1 py-[1px]"
                style={{ background: sigColor.bg, color: sigColor.text }}
              >
                {sigColor.label}
              </span>
            </div>

            {/* Sparkline */}
            <div className="flex justify-center">
              <MiniSparkline data={factor.sparkline} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Z-Score Inline Bar ──

function ZScoreBar({ value }: { value: number }) {
  const W = 36;
  const H = 8;
  const CENTER = W / 2;
  const maxZ = 3;
  const clampedZ = Math.max(-maxZ, Math.min(maxZ, value));
  const barWidth = (Math.abs(clampedZ) / maxZ) * (W / 2 - 1);
  const isPositive = clampedZ >= 0;
  const barX = isPositive ? CENTER : CENTER - barWidth;
  const color = isPositive ? '#22c55e' : '#ef4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {/* Background */}
      <rect x={0} y={0} width={W} height={H} fill="rgba(255,255,255,0.03)" />
      {/* Center line */}
      <line x1={CENTER} y1={0} x2={CENTER} y2={H} stroke="rgba(255,255,255,0.15)" strokeWidth={0.5} />
      {/* Bar */}
      <rect x={barX} y={1} width={Math.max(barWidth, 0.5)} height={H - 2} fill={color} opacity={0.7} />
      {/* Value text */}
      <text
        x={isPositive ? barX + barWidth + 1 : barX - 1}
        y={H / 2 + 0.5}
        textAnchor={isPositive ? 'start' : 'end'}
        dominantBaseline="middle"
        fill={color}
        fontSize={5}
        fontFamily="monospace"
        fontWeight="bold"
      >
        {value > 0 ? '+' : ''}{value.toFixed(1)}
      </text>
    </svg>
  );
}

// ── Mini Sparkline ──

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;

  const W = 36;
  const H = 12;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x},${y}`;
  }).join(' ');

  const lastVal = data[data.length - 1];
  const color = lastVal >= 0 ? '#84cc16' : '#ef4444';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── 3. Factor Correlation Heatmap (SVG) ──

function FactorCorrelationHeatmap({ data }: { data: FactorExposureData }) {
  const t = useT();
  const { names, values } = data.factorCorrelationMatrix;
  const n = names.length;

  if (n === 0) return null;

  // Short labels for the matrix
  const shortLabels = useMemo(() => {
    return names.map((name) => {
      if (name.length <= 6) return name;
      // Abbreviate
      const map: Record<string, string> = {
        'Market (Beta)': 'Mkt',
        'Value': 'Val',
        'Size': 'Size',
        'Momentum': 'Mom',
        'Quality': 'Qual',
        'Low Volatility': 'LVol',
        'Growth': 'Grwth',
        'Dividend Yield': 'DivY',
      };
      return map[name] || name.slice(0, 4);
    });
  }, [names]);

  const CELL = 28;
  const LABEL_W = 38;
  const LABEL_H = 38;
  const W = LABEL_W + n * CELL;
  const H = LABEL_H + n * CELL;

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'feCorrMatrix', 'Factor Correlation Matrix')}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* Top labels */}
        {shortLabels.map((label, i) => (
          <text
            key={`top-${i}`}
            x={LABEL_W + i * CELL + CELL / 2}
            y={LABEL_H - 4}
            textAnchor="middle"
            fill="#71717a"
            fontSize={6}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {label}
          </text>
        ))}

        {/* Left labels */}
        {shortLabels.map((label, i) => (
          <text
            key={`left-${i}`}
            x={LABEL_W - 3}
            y={LABEL_H + i * CELL + CELL / 2 + 1}
            textAnchor="end"
            dominantBaseline="middle"
            fill="#71717a"
            fontSize={6}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {values.map((row, i) =>
          row.map((val, j) => {
            const x = LABEL_W + j * CELL;
            const y = LABEL_H + i * CELL;
            const isDiagonal = i === j;
            const bg = isDiagonal ? 'rgba(63,63,70,0.3)' : corrColor(val);
            const textFill = isDiagonal ? '#a1a1aa' : corrTextColor(val);

            return (
              <g key={`${i}-${j}`}>
                <rect x={x} y={y} width={CELL} height={CELL} fill={bg} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />
                <text
                  x={x + CELL / 2}
                  y={y + CELL / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={textFill}
                  fontSize={6}
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {isDiagonal ? '1.00' : val.toFixed(2)}
                </text>
              </g>
            );
          }),
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-1.5">
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(59,130,246,0.5)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(255,255,255,0.05)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Zero</span>
        </div>
        <div className="flex items-center gap-1">
          <svg width="16" height="6" viewBox="0 0 16 6">
            <rect x="0" y="0" width="16" height="6" fill="rgba(239,68,68,0.5)" />
          </svg>
          <span className="text-[6px] font-mono text-neutral-600">Positive</span>
        </div>
      </div>
    </div>
  );
}

// ── 4. Regime Description ──

function RegimeDescription({ data }: { data: FactorExposureData }) {
  const t = useT();
  const { regime } = data;
  const styleColor = getStyleColor(regime.style);

  // Find top 3 factors by absolute momentum (20d return)
  const topFactors = useMemo(
    () => [...data.factors].sort((a, b) => Math.abs(b.return20d) - Math.abs(a.return20d)).slice(0, 3),
    [data.factors],
  );

  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5">
        {tr(t, 'feRegime', 'Market Factor Regime')}
      </div>

      {/* Dominant factor */}
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Dominant:</span>
        <span
          className="text-[9px] font-mono font-black uppercase"
          style={{ color: styleColor.text }}
        >
          {regime.dominantFactor}
        </span>
      </div>

      {/* Top 3 momentum bars */}
      <div className="flex gap-1.5 mb-2">
        {topFactors.map((f) => {
          const retColor = getReturnColor(f.return20d);
          return (
            <div
              key={f.name}
              className="flex-1 flex flex-col gap-0.5 px-1.5 py-1 border border-border/20"
              style={{ borderTopColor: retColor, borderTopWidth: 2 }}
            >
              <span className="text-[6px] font-mono text-neutral-600 uppercase truncate">
                {f.name}
              </span>
              <span
                className="text-[9px] font-mono font-black tabular-nums"
                style={{ color: retColor }}
              >
                {fmtPct(f.return20d)}
              </span>
              <span className="text-[6px] font-mono text-neutral-600 tabular-nums">
                Z: {f.zScore > 0 ? '+' : ''}{f.zScore.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-[7.5px] font-mono text-neutral-500 leading-relaxed">
        {regime.description}
      </p>

      {/* Timestamp */}
      <div className="mt-2 text-[6px] font-mono text-neutral-700 uppercase">
        {tr(t, 'feUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
