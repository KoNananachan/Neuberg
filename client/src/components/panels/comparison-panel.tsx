import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useComparison, type ComparisonSeries } from '../../api/hooks/use-comparison';
import { GitCompare, RefreshCw, X } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../stores/use-app-store';

const COLORS = ['#22d3ee', '#a78bfa', '#f472b6', '#facc15', '#4ade80', '#fb923c'];

const RANGES = [
  { key: '1mo', label: 'perfRange1M' },
  { key: '3mo', label: 'perfRange3M' },
  { key: '6mo', label: 'perfRange6M' },
  { key: 'ytd', label: 'perfRangeYTD' },
  { key: '1y', label: 'perfRange1Y' },
  { key: '2y', label: 'perfRange2Y' },
  { key: '5y', label: 'perfRange5Y' },
] as const;

const DEFAULT_SYMBOLS = ['SPY', 'QQQ', 'DIA'];

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function formatPercent(val: number): string {
  const sign = val >= 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

function formatPrice(val: number): string {
  if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return val.toFixed(2);
  return val.toFixed(4);
}

// SVG performance chart
function PerformanceChart({ series }: { series: ComparisonSeries[] }) {
  const padding = { top: 20, right: 16, bottom: 32, left: 52 };

  const chartData = useMemo(() => {
    if (series.length === 0) return null;

    // Find global min/max timestamp and return range
    let minTs = Infinity, maxTs = -Infinity;
    let minReturn = 0, maxReturn = 0;

    for (const s of series) {
      for (const dp of s.dataPoints) {
        if (dp.timestamp < minTs) minTs = dp.timestamp;
        if (dp.timestamp > maxTs) maxTs = dp.timestamp;
        if (dp.normalizedReturn < minReturn) minReturn = dp.normalizedReturn;
        if (dp.normalizedReturn > maxReturn) maxReturn = dp.normalizedReturn;
      }
    }

    if (minTs === Infinity || maxTs === minTs) return null;

    // Add some padding to y range
    const yPad = Math.max((maxReturn - minReturn) * 0.1, 1);
    minReturn -= yPad;
    maxReturn += yPad;

    return { minTs, maxTs, minReturn, maxReturn };
  }, [series]);

  if (!chartData) return null;

  const { minTs, maxTs, minReturn, maxReturn } = chartData;
  const viewWidth = 600;
  const viewHeight = 300;
  const chartW = viewWidth - padding.left - padding.right;
  const chartH = viewHeight - padding.top - padding.bottom;

  const scaleX = (ts: number) => padding.left + ((ts - minTs) / (maxTs - minTs)) * chartW;
  const scaleY = (ret: number) => padding.top + ((maxReturn - ret) / (maxReturn - minReturn)) * chartH;

  // Y-axis grid lines
  const yRange = maxReturn - minReturn;
  const yStep = (() => {
    const raw = yRange / 5;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    if (norm <= 1) return mag;
    if (norm <= 2) return 2 * mag;
    if (norm <= 5) return 5 * mag;
    return 10 * mag;
  })();

  const yGridLines: number[] = [];
  const yStart = Math.ceil(minReturn / yStep) * yStep;
  for (let v = yStart; v <= maxReturn; v += yStep) {
    yGridLines.push(v);
  }

  // X-axis labels (pick ~5 dates)
  const xLabelCount = 5;
  const xLabels: { ts: number; label: string }[] = [];
  for (let i = 0; i < xLabelCount; i++) {
    const ts = minTs + (i / (xLabelCount - 1)) * (maxTs - minTs);
    xLabels.push({ ts, label: formatDate(ts) });
  }

  // Zero line y-position
  const zeroY = scaleY(0);
  const showZeroLine = minReturn < 0 && maxReturn > 0;

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Grid lines */}
      {yGridLines.map((v, i) => {
        const y = scaleY(v);
        return (
          <g key={i}>
            <line
              x1={padding.left}
              y1={y}
              x2={viewWidth - padding.right}
              y2={y}
              stroke="rgba(63,63,70,0.3)"
              strokeWidth="0.5"
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              fill="#71717a"
              fontSize="8"
              fontFamily="monospace"
            >
              {v >= 0 ? '+' : ''}{v.toFixed(1)}%
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      {showZeroLine && (
        <line
          x1={padding.left}
          y1={zeroY}
          x2={viewWidth - padding.right}
          y2={zeroY}
          stroke="rgba(161,161,170,0.5)"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      )}

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

      {/* Series lines */}
      {series.map((s, si) => {
        if (s.dataPoints.length < 2) return null;
        const color = COLORS[si % COLORS.length];
        const points = s.dataPoints
          .map(dp => `${scaleX(dp.timestamp).toFixed(1)},${scaleY(dp.normalizedReturn).toFixed(1)}`)
          .join(' ');

        return (
          <polyline
            key={s.symbol}
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function ComparisonPanel() {
  const t = useT();
  const selectedSymbol = useAppStore(s => s.selectedSymbol);
  const [inputValue, setInputValue] = useState('');
  const [symbols, setSymbols] = useState<string[]>(() => {
    if (selectedSymbol) {
      return [selectedSymbol, 'SPY'];
    }
    return DEFAULT_SYMBOLS;
  });
  const [range, setRange] = useState('1y');

  const { data, isLoading, refetch } = useComparison(symbols, range);

  const addSymbol = useCallback((sym: string) => {
    const cleaned = sym.trim().toUpperCase();
    if (!cleaned || symbols.includes(cleaned) || symbols.length >= 6) return;
    setSymbols(prev => [...prev, cleaned]);
  }, [symbols]);

  const removeSymbol = useCallback((sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym));
  }, []);

  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const parts = inputValue.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
      const newSymbols = [...symbols];
      for (const p of parts) {
        if (!newSymbols.includes(p) && newSymbols.length < 6) {
          newSymbols.push(p);
        }
      }
      setSymbols(newSymbols);
      setInputValue('');
    }
  }, [inputValue, symbols]);

  const handleCompare = useCallback(() => {
    const parts = inputValue.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    const newSymbols = [...symbols];
    for (const p of parts) {
      if (!newSymbols.includes(p) && newSymbols.length < 6) {
        newSymbols.push(p);
      }
    }
    setSymbols(newSymbols);
    setInputValue('');
  }, [inputValue, symbols]);

  // Sort series by return for table
  const sortedSeries = useMemo(() => {
    if (!data?.series) return [];
    return [...data.series].sort((a, b) => b.changePercent - a.changePercent);
  }, [data]);

  return (
    <GlassCard
      title={
        <span className="flex items-center gap-1.5">
          <GitCompare className="w-3 h-3" />
          {t('panelPerformance')}
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
      {/* Symbol input area */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border/30 bg-black/20 space-y-1.5">
        {/* Symbol tags */}
        <div className="flex flex-wrap gap-1">
          {symbols.map((sym, i) => (
            <span
              key={sym}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold border border-border/40 bg-black/40"
              style={{ color: COLORS[i % COLORS.length] }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              {sym}
              <button
                onClick={() => removeSymbol(sym)}
                className="text-neutral/40 hover:text-red-400 ml-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t('perfAdd')}
            className="flex-1 min-w-0 bg-black/40 border border-border/30 px-2 py-0.5 text-[10px] font-mono text-white placeholder-neutral/30 focus:outline-none focus:border-accent/50"
            disabled={symbols.length >= 6}
          />
          <button
            onClick={handleCompare}
            className="px-2 py-0.5 text-[9px] font-mono font-bold bg-accent/20 text-accent hover:bg-accent/30 transition-colors border border-accent/30"
          >
            {t('perfCompare')}
          </button>
        </div>
      </div>

      {/* Range selector */}
      <div className="shrink-0 flex items-center gap-0.5 px-3 py-1 border-b border-border/30 bg-black/10">
        {RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`px-2 py-0.5 text-[9px] font-mono font-black transition-all ${
              range === r.key
                ? 'bg-accent/20 text-accent'
                : 'text-neutral/50 hover:text-white'
            }`}
          >
            {t(r.label)}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-auto min-h-0">
        {symbols.length < 2 ? (
          <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {t('perfNoData')}
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-2">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">{t('loading')}</span>
          </div>
        ) : data && data.series.length > 0 ? (
          <>
            {/* Chart */}
            <div className="px-2 pt-2 pb-1" style={{ minHeight: 180 }}>
              <PerformanceChart series={data.series} />
            </div>

            {/* Legend */}
            <div className="shrink-0 flex flex-wrap gap-x-3 gap-y-0.5 px-3 py-1 border-b border-border/20">
              {data.series.map((s, i) => (
                <span key={s.symbol} className="flex items-center gap-1 text-[8px] font-mono">
                  <span
                    className="w-2 h-0.5 inline-block"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span style={{ color: COLORS[i % COLORS.length] }}>{s.symbol}</span>
                  <span className={s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPercent(s.changePercent)}
                  </span>
                </span>
              ))}
            </div>

            {/* Summary table */}
            <div className="shrink-0 px-2 pb-2">
              <table className="w-full text-[9px] font-mono">
                <thead>
                  <tr className="text-neutral/50 uppercase">
                    <th className="text-left py-1 px-1 font-normal">Symbol</th>
                    <th className="text-right py-1 px-1 font-normal">{t('perfReturn')}</th>
                    <th className="text-right py-1 px-1 font-normal">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSeries.map((s) => {
                    const colorIdx = data.series.findIndex(ds => ds.symbol === s.symbol);
                    const color = COLORS[colorIdx >= 0 ? colorIdx % COLORS.length : 0];
                    return (
                      <tr key={s.symbol} className="border-t border-border/10 hover:bg-white/[0.02]">
                        <td className="py-1 px-1">
                          <span className="flex items-center gap-1.5">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-white font-bold">{s.symbol}</span>
                            <span className="text-neutral/40 truncate max-w-[80px]">{s.name}</span>
                          </span>
                        </td>
                        <td className={`py-1 px-1 text-right font-bold ${
                          s.changePercent >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {formatPercent(s.changePercent)}
                        </td>
                        <td className="py-1 px-1 text-right text-neutral/70">
                          ${formatPrice(s.currentPrice)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {t('perfNoData')}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
