import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePairs, type PairsData } from '../../api/hooks/use-pairs';
import { Scale, RefreshCw, ArrowLeftRight } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../stores/use-app-store';

const RANGES = [
  { key: '3mo', label: '3M' },
  { key: '6mo', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: '2y', label: '2Y' },
] as const;

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatNum(val: number, decimals = 4): string {
  return val.toFixed(decimals);
}

function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

// Ratio chart: price ratio over time with mean and sigma bands
function RatioChart({ data }: { data: PairsData }) {
  const padding = { top: 20, right: 16, bottom: 32, left: 56 };
  const viewWidth = 600;
  const viewHeight = 220;

  const chartData = useMemo(() => {
    const series = data.ratioSeries;
    if (series.length < 2) return null;

    const { meanRatio, stdRatio } = data.stats;
    const ratios = series.map(p => p.ratio);
    const minTs = series[0].timestamp;
    const maxTs = series[series.length - 1].timestamp;

    // Y range: include mean +/- 3 sigma or actual min/max
    const yMin = Math.min(Math.min(...ratios), meanRatio - 2.5 * stdRatio);
    const yMax = Math.max(Math.max(...ratios), meanRatio + 2.5 * stdRatio);
    const yPad = (yMax - yMin) * 0.05;

    return {
      series,
      minTs,
      maxTs,
      yMin: yMin - yPad,
      yMax: yMax + yPad,
      meanRatio,
      stdRatio,
    };
  }, [data]);

  if (!chartData) return null;

  const { series, minTs, maxTs, yMin, yMax, meanRatio, stdRatio } = chartData;
  const chartW = viewWidth - padding.left - padding.right;
  const chartH = viewHeight - padding.top - padding.bottom;

  const scaleX = (ts: number) => padding.left + ((ts - minTs) / (maxTs - minTs)) * chartW;
  const scaleY = (val: number) => padding.top + ((yMax - val) / (yMax - yMin)) * chartH;

  // Sigma bands
  const bands = [
    { level: 2, y: scaleY(meanRatio + 2 * stdRatio), label: '+2\u03C3' },
    { level: 1, y: scaleY(meanRatio + 1 * stdRatio), label: '+1\u03C3' },
    { level: 0, y: scaleY(meanRatio), label: '\u03BC' },
    { level: -1, y: scaleY(meanRatio - 1 * stdRatio), label: '-1\u03C3' },
    { level: -2, y: scaleY(meanRatio - 2 * stdRatio), label: '-2\u03C3' },
  ];

  // X-axis labels
  const xLabelCount = 5;
  const xLabels: Array<{ ts: number; label: string }> = [];
  for (let i = 0; i < xLabelCount; i++) {
    const ts = minTs + (i / (xLabelCount - 1)) * (maxTs - minTs);
    xLabels.push({ ts, label: formatDate(ts) });
  }

  // Build ratio line path
  const linePath = series
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(p.timestamp).toFixed(1)},${scaleY(p.ratio).toFixed(1)}`)
    .join(' ');

  // Color zones for extreme areas
  const plus2Y = scaleY(meanRatio + 2 * stdRatio);
  const minus2Y = scaleY(meanRatio - 2 * stdRatio);
  const chartTop = padding.top;
  const chartBottom = padding.top + chartH;

  // Current point
  const lastPoint = series[series.length - 1];
  const lastX = scaleX(lastPoint.timestamp);
  const lastY = scaleY(lastPoint.ratio);

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Red zone above +2 sigma */}
      <rect
        x={padding.left}
        y={chartTop}
        width={chartW}
        height={Math.max(0, plus2Y - chartTop)}
        fill="rgba(239,68,68,0.06)"
      />
      {/* Green zone below -2 sigma */}
      <rect
        x={padding.left}
        y={minus2Y}
        width={chartW}
        height={Math.max(0, chartBottom - minus2Y)}
        fill="rgba(34,197,94,0.06)"
      />

      {/* Sigma band lines */}
      {bands.map(band => {
        const isMean = band.level === 0;
        return (
          <g key={band.level}>
            <line
              x1={padding.left}
              y1={band.y}
              x2={viewWidth - padding.right}
              y2={band.y}
              stroke={isMean ? 'rgba(244,114,182,0.6)' : 'rgba(161,161,170,0.3)'}
              strokeWidth={isMean ? 1 : 0.5}
              strokeDasharray={isMean ? 'none' : '4 2'}
            />
            <text
              x={viewWidth - padding.right + 4}
              y={band.y + 3}
              fill={isMean ? '#f472b6' : '#71717a'}
              fontSize="7"
              fontFamily="monospace"
            >
              {band.label}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={scaleX(xl.ts)}
          y={viewHeight - 6}
          textAnchor="middle"
          fill="#71717a"
          fontSize="8"
          fontFamily="monospace"
        >
          {xl.label}
        </text>
      ))}

      {/* Y-axis labels for mean and current */}
      <text
        x={padding.left - 6}
        y={scaleY(meanRatio) + 3}
        textAnchor="end"
        fill="#f472b6"
        fontSize="7"
        fontFamily="monospace"
      >
        {formatNum(meanRatio)}
      </text>

      {/* Ratio line */}
      <path
        d={linePath}
        fill="none"
        stroke="#f472b6"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Current point marker */}
      <circle
        cx={lastX}
        cy={lastY}
        r={3}
        fill="#f472b6"
        stroke="#000"
        strokeWidth="1"
      />
      <text
        x={lastX - 6}
        y={lastY - 8}
        textAnchor="end"
        fill="#ffffff"
        fontSize="8"
        fontFamily="monospace"
        fontWeight="bold"
      >
        {formatNum(lastPoint.ratio)}
      </text>
    </svg>
  );
}

// Spread chart: z-score over time with bands
function SpreadChart({ data }: { data: PairsData }) {
  const padding = { top: 16, right: 16, bottom: 32, left: 56 };
  const viewWidth = 600;
  const viewHeight = 180;

  const chartData = useMemo(() => {
    const series = data.spreadSeries;
    if (series.length < 2) return null;

    const spreads = series.map(p => p.spread);
    const minTs = series[0].timestamp;
    const maxTs = series[series.length - 1].timestamp;

    const absMax = Math.max(Math.abs(Math.min(...spreads)), Math.abs(Math.max(...spreads)), 2.5);
    const yRange = absMax * 1.1;

    return { series, minTs, maxTs, yMin: -yRange, yMax: yRange };
  }, [data]);

  if (!chartData) return null;

  const { series, minTs, maxTs, yMin, yMax } = chartData;
  const chartW = viewWidth - padding.left - padding.right;
  const chartH = viewHeight - padding.top - padding.bottom;

  const scaleX = (ts: number) => padding.left + ((ts - minTs) / (maxTs - minTs)) * chartW;
  const scaleY = (val: number) => padding.top + ((yMax - val) / (yMax - yMin)) * chartH;

  // Band lines
  const bandLevels = [-2, -1, 0, 1, 2];

  // X-axis labels
  const xLabelCount = 5;
  const xLabels: Array<{ ts: number; label: string }> = [];
  for (let i = 0; i < xLabelCount; i++) {
    const ts = minTs + (i / (xLabelCount - 1)) * (maxTs - minTs);
    xLabels.push({ ts, label: formatDate(ts) });
  }

  // Build spread line, with color segments
  // We'll use a single path but color it based on where it is
  const segments: Array<{ path: string; color: string }> = [];
  for (let i = 1; i < series.length; i++) {
    const prev = series[i - 1];
    const curr = series[i];
    const avgSpread = (prev.spread + curr.spread) / 2;

    let color: string;
    if (avgSpread > 2) color = '#ef4444';
    else if (avgSpread > 1) color = '#f97316';
    else if (avgSpread < -2) color = '#22c55e';
    else if (avgSpread < -1) color = '#3b82f6';
    else color = '#a78bfa';

    const x1 = scaleX(prev.timestamp).toFixed(1);
    const y1 = scaleY(prev.spread).toFixed(1);
    const x2 = scaleX(curr.timestamp).toFixed(1);
    const y2 = scaleY(curr.spread).toFixed(1);
    segments.push({ path: `M${x1},${y1} L${x2},${y2}`, color });
  }

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background zones */}
      <rect
        x={padding.left}
        y={padding.top}
        width={chartW}
        height={Math.max(0, scaleY(2) - padding.top)}
        fill="rgba(239,68,68,0.05)"
      />
      <rect
        x={padding.left}
        y={scaleY(-2)}
        width={chartW}
        height={Math.max(0, padding.top + chartH - scaleY(-2))}
        fill="rgba(34,197,94,0.05)"
      />

      {/* Band lines */}
      {bandLevels.map(level => {
        const isZero = level === 0;
        const y = scaleY(level);
        return (
          <g key={level}>
            <line
              x1={padding.left}
              y1={y}
              x2={viewWidth - padding.right}
              y2={y}
              stroke={isZero ? 'rgba(161,161,170,0.5)' : 'rgba(161,161,170,0.2)'}
              strokeWidth={isZero ? 1 : 0.5}
              strokeDasharray={isZero ? 'none' : '4 2'}
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="#71717a"
              fontSize="7"
              fontFamily="monospace"
            >
              {level > 0 ? '+' : ''}{level}
            </text>
          </g>
        );
      })}

      {/* X-axis labels */}
      {xLabels.map((xl, i) => (
        <text
          key={i}
          x={scaleX(xl.ts)}
          y={viewHeight - 6}
          textAnchor="middle"
          fill="#71717a"
          fontSize="8"
          fontFamily="monospace"
        >
          {xl.label}
        </text>
      ))}

      {/* Spread line segments */}
      {segments.map((seg, i) => (
        <path
          key={i}
          d={seg.path}
          fill="none"
          stroke={seg.color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Current point */}
      {series.length > 0 && (() => {
        const last = series[series.length - 1];
        const cx = scaleX(last.timestamp);
        const cy = scaleY(last.spread);
        const color = last.spread > 2 ? '#ef4444' : last.spread < -2 ? '#22c55e' : '#a78bfa';
        return (
          <g>
            <circle cx={cx} cy={cy} r={3} fill={color} stroke="#000" strokeWidth="1" />
            <text
              x={cx - 6}
              y={cy - 8}
              textAnchor="end"
              fill="#ffffff"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="bold"
            >
              {last.spread.toFixed(2)}
            </text>
          </g>
        );
      })()}
    </svg>
  );
}

export function PairsPanel() {
  const t = useT();
  const selectedSymbol = useAppStore(s => s.selectedSymbol);

  const [inputA, setInputA] = useState(() => selectedSymbol || 'AAPL');
  const [inputB, setInputB] = useState(() => selectedSymbol ? 'SPY' : 'MSFT');
  const [symbolA, setSymbolA] = useState(() => selectedSymbol || 'AAPL');
  const [symbolB, setSymbolB] = useState(() => selectedSymbol ? 'SPY' : 'MSFT');
  const [range, setRange] = useState('1y');

  const { data, isLoading, refetch, error } = usePairs(symbolA, symbolB, range);

  const handleAnalyze = useCallback(() => {
    const a = inputA.trim().toUpperCase();
    const b = inputB.trim().toUpperCase();
    if (a && b && a !== b) {
      setSymbolA(a);
      setSymbolB(b);
    }
  }, [inputA, inputB]);

  const handleSwap = useCallback(() => {
    setInputA(inputB);
    setInputB(inputA);
    setSymbolA(symbolB);
    setSymbolB(symbolA);
  }, [inputA, inputB, symbolA, symbolB]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAnalyze();
  }, [handleAnalyze]);

  // Signal text
  const signal = useMemo(() => {
    if (!data) return null;
    const z = data.stats.zScore;
    if (z > 2) return { text: `SHORT ${data.symbolA} / LONG ${data.symbolB}`, color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' };
    if (z < -2) return { text: `LONG ${data.symbolA} / SHORT ${data.symbolB}`, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/30' };
    return { text: t('pairsNeutral').toUpperCase(), color: 'text-neutral/50', bg: 'bg-neutral/5 border-neutral/20' };
  }, [data, t]);

  return (
    <GlassCard
      title={
        <span className="flex items-center gap-1.5">
          <Scale className="w-3 h-3 text-pink-400" />
          PAIRS TRADING
        </span>
      }
      headerRight={
        <button
          onClick={() => refetch()}
          className="p-0.5 text-neutral/50 hover:text-accent transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      }
      className="h-full"
    >
      {/* Symbol inputs */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border/30 bg-black/20 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral/50 w-3">A</span>
            <input
              type="text"
              value={inputA}
              onChange={e => setInputA(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="AAPL"
              className="flex-1 min-w-0 bg-black/40 border border-border/30 px-2 py-0.5 text-[10px] font-mono text-white placeholder-neutral/30 focus:outline-none focus:border-pink-400/50"
            />
          </div>
          <button
            onClick={handleSwap}
            className="p-1 text-neutral/40 hover:text-pink-400 transition-colors shrink-0"
            title="Swap"
          >
            <ArrowLeftRight className="w-3 h-3" />
          </button>
          <div className="flex-1 flex items-center gap-1">
            <span className="text-[8px] font-mono text-neutral/50 w-3">B</span>
            <input
              type="text"
              value={inputB}
              onChange={e => setInputB(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="MSFT"
              className="flex-1 min-w-0 bg-black/40 border border-border/30 px-2 py-0.5 text-[10px] font-mono text-white placeholder-neutral/30 focus:outline-none focus:border-pink-400/50"
            />
          </div>
          <button
            onClick={handleAnalyze}
            className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-pink-400/20 text-pink-400 hover:bg-pink-400/30 transition-colors border border-pink-400/30 shrink-0"
          >
            {t('pairsAnalyze')}
          </button>
        </div>
      </div>

      {/* Range tabs */}
      <div className="shrink-0 flex items-center gap-0.5 px-3 py-1 border-b border-border/30 bg-black/10">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-2 py-0.5 text-[9px] font-mono font-black transition-all ${
              range === r.key
                ? 'bg-pink-400/20 text-pink-400'
                : 'text-neutral/50 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-auto min-h-0">
        {!symbolA || !symbolB || symbolA === symbolB ? (
          <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {t('pairsNoData')}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <div className="w-5 h-5 border-2 border-pink-400/30 border-t-pink-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">{t('loading')}</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center flex-1 text-red-400/60 text-[10px] font-mono uppercase tracking-widest px-4 text-center">
            {(error as Error).message || 'Failed to load data'}
          </div>
        ) : data ? (
          <>
            {/* Key Stats Bar */}
            <div className="shrink-0 grid grid-cols-4 gap-px px-3 py-2 border-b border-border/30 bg-black/10">
              <StatCell
                label={t('pairsCorrelation')}
                value={formatNum(data.stats.correlation, 3)}
                color={data.stats.correlation > 0.7 ? 'text-emerald-400' : data.stats.correlation < 0.3 ? 'text-red-400' : 'text-yellow-400'}
              />
              <StatCell
                label={t('pairsZScore')}
                value={formatNum(data.stats.zScore, 2)}
                color={Math.abs(data.stats.zScore) > 2 ? (data.stats.zScore > 0 ? 'text-red-400' : 'text-emerald-400') : 'text-neutral/70'}
                subtitle={Math.abs(data.stats.zScore) > 2 ? (data.stats.zScore > 0 ? 'Overbought' : 'Oversold') : ''}
              />
              <StatCell
                label={`Ratio / ${t('pairsMean')}`}
                value={`${formatNum(data.stats.currentRatio)} / ${formatNum(data.stats.meanRatio)}`}
                color="text-white"
              />
              <StatCell
                label="Percentile"
                value={formatPercent(data.stats.percentile)}
                color="text-pink-400"
              />
            </div>

            {/* Signal indicator */}
            {signal && (
              <div className={`shrink-0 mx-3 mt-2 px-3 py-1.5 text-center text-[10px] font-mono font-bold border ${signal.bg} ${signal.color} tracking-wider`}>
                {t('pairsSignal')}: {signal.text}
              </div>
            )}

            {/* Ratio Chart */}
            <div className="shrink-0 px-2 pt-2">
              <div className="text-[8px] font-mono text-neutral/50 uppercase px-1 mb-0.5">{t('pairsRatio')} ({data.symbolA}/{data.symbolB})</div>
              <div style={{ minHeight: 140 }}>
                <RatioChart data={data} />
              </div>
            </div>

            {/* Spread Chart */}
            <div className="shrink-0 px-2 pt-1 pb-1">
              <div className="text-[8px] font-mono text-neutral/50 uppercase px-1 mb-0.5">{t('pairsSpread')}</div>
              <div style={{ minHeight: 120 }}>
                <SpreadChart data={data} />
              </div>
            </div>

            {/* Statistics table */}
            <div className="shrink-0 px-3 pb-2">
              <table className="w-full text-[9px] font-mono">
                <tbody>
                  <StatRow label="Current Ratio" value={formatNum(data.stats.currentRatio)} />
                  <StatRow label={t('pairsMean')} value={formatNum(data.stats.meanRatio)} />
                  <StatRow label="Std Dev" value={formatNum(data.stats.stdRatio)} />
                  <StatRow label="Min" value={formatNum(data.stats.minRatio)} />
                  <StatRow label="Max" value={formatNum(data.stats.maxRatio)} />
                  <StatRow
                    label={t('pairsZScore')}
                    value={formatNum(data.stats.zScore, 2)}
                    valueColor={Math.abs(data.stats.zScore) > 2 ? (data.stats.zScore > 0 ? 'text-red-400' : 'text-emerald-400') : undefined}
                  />
                  <StatRow
                    label={t('pairsCorrelation')}
                    value={formatNum(data.stats.correlation, 3)}
                    valueColor={data.stats.correlation > 0.7 ? 'text-emerald-400' : data.stats.correlation < 0.3 ? 'text-red-400' : undefined}
                  />
                  <StatRow label="Percentile" value={formatPercent(data.stats.percentile)} />
                  <StatRow label={`${data.symbolA} Price`} value={`$${data.currentPriceA.toFixed(2)}`} />
                  <StatRow label={`${data.symbolB} Price`} value={`$${data.currentPriceB.toFixed(2)}`} />
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {t('pairsNoData')}
          </div>
        )}
      </div>
    </GlassCard>
  );
}

function StatCell({ label, value, color, subtitle }: { label: string; value: string; color: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider">{label}</div>
      <div className={`text-[11px] font-mono font-bold ${color}`}>{value}</div>
      {subtitle && <div className="text-[7px] font-mono text-neutral/40 uppercase">{subtitle}</div>}
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <tr className="border-t border-border/10 hover:bg-white/[0.02]">
      <td className="py-0.5 px-1 text-neutral/50">{label}</td>
      <td className={`py-0.5 px-1 text-right font-bold ${valueColor || 'text-white'}`}>{value}</td>
    </tr>
  );
}
