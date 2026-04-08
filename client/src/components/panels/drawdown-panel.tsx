import { useState, useMemo, useCallback } from 'react';
import { useDrawdown, type DrawdownEvent, type DrawdownPoint, type DrawdownStats } from '../../api/hooks/use-drawdown';
import { useT } from '../../i18n';
import { TrendingDown, RefreshCw, Search } from 'lucide-react';

const PERIODS = ['1y', '2y', '5y', '10y'] as const;
const PERIOD_LABELS: Record<string, string> = { '1y': '1Y', '2y': '2Y', '5y': '5Y', '10y': '10Y' };

export function DrawdownPanel() {
  const t = useT();
  const [symbol, setSymbol] = useState('SPY');
  const [inputValue, setInputValue] = useState('SPY');
  const [period, setPeriod] = useState<string>('5y');
  const { data, isLoading, refetch } = useDrawdown(symbol, period);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim().toUpperCase();
    if (trimmed) setSymbol(trimmed);
  }, [inputValue]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {t('panelDrawdown') ?? 'DRAWDOWN ANALYSIS'}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-rose-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/20 shrink-0">
        <form onSubmit={handleSubmit} className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral/30" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value.toUpperCase())}
              placeholder="Symbol"
              className="w-20 pl-6 pr-1.5 py-1 bg-white/[0.03] border border-border/20 rounded text-[10px] font-mono text-white placeholder:text-neutral/30 focus:outline-none focus:border-rose-400/40"
            />
          </div>
          <button
            type="submit"
            className="px-2 py-1 bg-rose-500/10 border border-rose-500/20 rounded text-[8px] font-black font-mono uppercase text-rose-400 hover:bg-rose-500/20 transition-colors"
          >
            GO
          </button>
        </form>

        <div className="flex items-center gap-0.5 ml-auto">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
                period === p
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'text-neutral/40 hover:text-neutral/60 border border-transparent'
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading') ?? 'Loading...'}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('ddNoData') ?? 'No drawdown data available'}
          </div>
        )}

        {data && (
          <>
            <SummaryStatsBar stats={data.stats} symbol={data.symbol} />
            <UnderwaterChart series={data.series} stats={data.stats} />
            <RiskMetrics series={data.series} stats={data.stats} />
            <DrawdownEventsTable events={data.events} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Stats Bar ──

function SummaryStatsBar({ stats, symbol }: { stats: DrawdownStats; symbol: string }) {
  const t = useT();

  const items = [
    {
      label: t('ddMaxDrawdown') ?? 'Max Drawdown',
      value: `${stats.maxDrawdown.toFixed(1)}%`,
      color: ddColor(stats.maxDrawdown),
    },
    {
      label: t('ddCurrentDD') ?? 'Current DD',
      value: stats.currentDrawdown === 0 ? 'None' : `${stats.currentDrawdown.toFixed(1)}%`,
      color: stats.currentDrawdown === 0 ? 'text-emerald-400' : ddColor(stats.currentDrawdown),
    },
    {
      label: t('ddDistATH') ?? 'Dist. from ATH',
      value: `${stats.distanceFromATH.toFixed(1)}%`,
      color: stats.distanceFromATH === 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      label: t('ddAvgRecovery') ?? 'Avg Recovery',
      value: stats.avgRecoveryDays > 0 ? `${stats.avgRecoveryDays}d` : 'N/A',
      color: 'text-amber-400',
    },
    {
      label: t('ddTotalDD') ?? 'Drawdowns',
      value: String(stats.totalDrawdowns),
      color: 'text-neutral/70',
    },
  ];

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {symbol} {t('ddSummary') ?? 'Summary'}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <div key={item.label} className="text-center">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className={`text-[13px] font-black font-mono ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Underwater Chart (THE key visualization) ──

function UnderwaterChart({ series, stats }: { series: DrawdownPoint[]; stats: DrawdownStats }) {
  const t = useT();

  // Downsample for performance if > 1500 points
  const displaySeries = useMemo(() => {
    if (series.length <= 1500) return series;
    const step = Math.ceil(series.length / 1500);
    const result: DrawdownPoint[] = [];
    for (let i = 0; i < series.length; i += step) {
      // Pick the point with deepest drawdown in this bucket
      let deepest = series[i];
      const end = Math.min(i + step, series.length);
      for (let j = i; j < end; j++) {
        if (series[j].drawdown < deepest.drawdown) deepest = series[j];
      }
      result.push(deepest);
    }
    // Always include first and last
    if (result[result.length - 1] !== series[series.length - 1]) {
      result.push(series[series.length - 1]);
    }
    return result;
  }, [series]);

  const W = 800;
  const H = 220;
  const PAD_L = 48;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Y-axis: 0% at top, minimum drawdown at bottom
  const minDD = Math.min(stats.maxDrawdown, -5);
  const yFloor = Math.floor(minDD / 5) * 5 - 5; // round down to next 5%

  const scaleX = useCallback(
    (i: number) => PAD_L + (i / Math.max(displaySeries.length - 1, 1)) * chartW,
    [displaySeries.length, chartW],
  );
  const scaleY = useCallback(
    (dd: number) => PAD_T + (dd / yFloor) * chartH,
    [yFloor, chartH],
  );

  // Build path
  const pathD = useMemo(() => {
    return displaySeries
      .map((pt, i) => {
        const x = scaleX(i);
        const y = scaleY(pt.drawdown);
        return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
      })
      .join(' ');
  }, [displaySeries, scaleX, scaleY]);

  // Area path (fill down to 0% line)
  const areaD = useMemo(() => {
    if (displaySeries.length === 0) return '';
    const lastX = scaleX(displaySeries.length - 1);
    const firstX = scaleX(0);
    const zeroY = scaleY(0);
    return `${pathD} L ${lastX},${zeroY} L ${firstX},${zeroY} Z`;
  }, [pathD, displaySeries.length, scaleX, scaleY]);

  // Y-axis grid lines
  const yTicks = useMemo(() => {
    const ticks: number[] = [0];
    for (let v = -5; v >= yFloor; v -= 5) {
      ticks.push(v);
    }
    return ticks;
  }, [yFloor]);

  // X-axis date labels (show ~6 labels)
  const xLabels = useMemo(() => {
    if (displaySeries.length < 2) return [];
    const labels: Array<{ x: number; label: string }> = [];
    const count = Math.min(6, displaySeries.length);
    const step = Math.floor(displaySeries.length / count);
    for (let i = 0; i < displaySeries.length; i += step) {
      const pt = displaySeries[i];
      const date = new Date(pt.date);
      const label = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      labels.push({ x: scaleX(i), label });
    }
    return labels;
  }, [displaySeries, scaleX]);

  // Current drawdown annotation
  const lastPt = displaySeries[displaySeries.length - 1];
  const lastX = scaleX(displaySeries.length - 1);
  const lastY = scaleY(lastPt?.drawdown ?? 0);

  // Gradient ID
  const gradId = 'dd-underwater-grad';

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {t('ddUnderwaterChart') ?? 'Underwater Chart'}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(244,63,94,0.05)" />
            <stop offset="40%" stopColor="rgba(244,63,94,0.15)" />
            <stop offset="100%" stopColor="rgba(190,18,60,0.45)" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + labels */}
        {yTicks.map((v) => {
          const y = scaleY(v);
          return (
            <g key={v}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}
                strokeDasharray={v === 0 ? undefined : '3,3'}
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                fill={v === 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'}
                fontSize={8}
                fontFamily="monospace"
                fontWeight={v === 0 ? 'bold' : 'normal'}
              >
                {v === 0 ? '0%' : `${v}%`}
              </text>
            </g>
          );
        })}

        {/* X-axis date labels */}
        {xLabels.map((lbl, i) => (
          <text
            key={i}
            x={lbl.x}
            y={H - 6}
            textAnchor="middle"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {lbl.label}
          </text>
        ))}

        {/* Underwater area fill with gradient */}
        {areaD && <path d={areaD} fill={`url(#${gradId})`} />}

        {/* Drawdown line */}
        {pathD && (
          <path d={pathD} fill="none" stroke="#f43f5e" strokeWidth={1.2} opacity={0.9} />
        )}

        {/* 0% reference line (solid) */}
        <line
          x1={PAD_L}
          y1={scaleY(0)}
          x2={W - PAD_R}
          y2={scaleY(0)}
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />

        {/* Current drawdown annotation */}
        {lastPt && lastPt.drawdown < 0 && (
          <g>
            <circle cx={lastX} cy={lastY} r={3.5} fill="#f43f5e" />
            <circle cx={lastX} cy={lastY} r={2} fill="#000" />
            <line
              x1={lastX}
              y1={lastY + 5}
              x2={lastX}
              y2={lastY + 18}
              stroke="#f43f5e"
              strokeWidth={0.8}
              strokeDasharray="2,1"
            />
            <rect
              x={lastX - 28}
              y={lastY + 18}
              width={56}
              height={14}
              rx={2}
              fill="rgba(244,63,94,0.15)"
              stroke="rgba(244,63,94,0.4)"
              strokeWidth={0.5}
            />
            <text
              x={lastX}
              y={lastY + 28}
              textAnchor="middle"
              fill="#fb7185"
              fontSize={8}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {lastPt.drawdown.toFixed(1)}%
            </text>
          </g>
        )}

        {/* Max drawdown marker */}
        {stats.maxDrawdown < -5 && (() => {
          const maxIdx = displaySeries.findIndex(
            (pt) => pt.date === stats.maxDrawdownDate,
          );
          if (maxIdx === -1) return null;
          const mx = scaleX(maxIdx);
          const my = scaleY(stats.maxDrawdown);
          return (
            <g>
              <line
                x1={mx}
                y1={my - 3}
                x2={mx}
                y2={my - 14}
                stroke="#be123c"
                strokeWidth={0.8}
                strokeDasharray="2,1"
              />
              <rect
                x={mx - 32}
                y={my - 28}
                width={64}
                height={14}
                rx={2}
                fill="rgba(190,18,60,0.2)"
                stroke="rgba(190,18,60,0.5)"
                strokeWidth={0.5}
              />
              <text
                x={mx}
                y={my - 18}
                textAnchor="middle"
                fill="#fda4af"
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                MAX {stats.maxDrawdown.toFixed(1)}%
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}

// ── Risk Metrics ──

function RiskMetrics({ series, stats }: { series: DrawdownPoint[]; stats: DrawdownStats }) {
  const t = useT();

  // Compute risk metrics
  const metrics = useMemo(() => {
    if (series.length < 20) return null;

    // Pain Index: average of all drawdown values (absolute)
    const drawdowns = series.map((pt) => pt.drawdown);
    const painIndex =
      Math.round(
        (drawdowns.reduce((sum, d) => sum + Math.abs(d), 0) / drawdowns.length) * 100,
      ) / 100;

    // Ulcer Index: RMS of drawdowns
    const sumSquares = drawdowns.reduce((sum, d) => sum + d * d, 0);
    const ulcerIndex = Math.round(Math.sqrt(sumSquares / drawdowns.length) * 100) / 100;

    // Calmar Ratio: annualized return / |max drawdown|
    const firstPrice = series[0]?.price ?? 0;
    const lastPrice = series[series.length - 1]?.price ?? 0;
    const tradingDays = series.length;
    const years = tradingDays / 252;
    let calmarRatio = 0;
    if (firstPrice > 0 && years > 0 && stats.maxDrawdown < 0) {
      const totalReturn = (lastPrice - firstPrice) / firstPrice;
      const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;
      calmarRatio = Math.round((annualizedReturn / Math.abs(stats.maxDrawdown / 100)) * 100) / 100;
    }

    return { painIndex, ulcerIndex, calmarRatio };
  }, [series, stats]);

  if (!metrics) return null;

  const items = [
    {
      label: t('ddCalmarRatio') ?? 'Calmar Ratio',
      value: metrics.calmarRatio.toFixed(2),
      desc: t('ddCalmarDesc') ?? 'Ann. Return / Max DD',
      color: metrics.calmarRatio >= 1 ? 'text-emerald-400' : metrics.calmarRatio >= 0.5 ? 'text-amber-400' : 'text-rose-400',
    },
    {
      label: t('ddPainIndex') ?? 'Pain Index',
      value: `${metrics.painIndex.toFixed(1)}%`,
      desc: t('ddPainDesc') ?? 'Avg Drawdown Depth',
      color: metrics.painIndex < 3 ? 'text-emerald-400' : metrics.painIndex < 8 ? 'text-amber-400' : 'text-rose-400',
    },
    {
      label: t('ddUlcerIndex') ?? 'Ulcer Index',
      value: metrics.ulcerIndex.toFixed(2),
      desc: t('ddUlcerDesc') ?? 'RMS of Drawdowns',
      color: metrics.ulcerIndex < 5 ? 'text-emerald-400' : metrics.ulcerIndex < 12 ? 'text-amber-400' : 'text-rose-400',
    },
  ];

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {t('ddRiskMetrics') ?? 'Risk Metrics'}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label} className="bg-white/[0.02] rounded px-2.5 py-2 border border-border/10">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-1">
              {item.label}
            </div>
            <div className={`text-[16px] font-black font-mono ${item.color}`}>{item.value}</div>
            <div className="text-[6px] font-mono text-neutral/25 mt-0.5">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Drawdown Events Table ──

function DrawdownEventsTable({ events }: { events: DrawdownEvent[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...events].sort((a, b) => a.maxDrawdown - b.maxDrawdown),
    [events],
  );

  if (sorted.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-neutral/30 text-[9px] font-mono uppercase">
        {t('ddNoEvents') ?? 'No significant drawdowns (> 5%) detected'}
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {t('ddEvents') ?? 'Drawdown Events'} ({sorted.length})
      </div>

      {/* Header */}
      <div className="grid grid-cols-[0.3fr_1fr_1fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-1 px-1 py-1 border-b border-border/15 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <span>#</span>
        <span>{t('ddPeakDate') ?? 'Peak'}</span>
        <span>{t('ddTroughDate') ?? 'Trough'}</span>
        <span>{t('ddRecoveryDate') ?? 'Recovery'}</span>
        <span className="text-right">{t('ddMaxDD') ?? 'Max DD%'}</span>
        <span className="text-right">{t('ddDuration') ?? 'Duration'}</span>
        <span className="text-right">{t('ddRecoveryTime') ?? 'Recovery'}</span>
        <span className="text-right">{t('ddStatus') ?? 'Status'}</span>
      </div>

      {/* Rows */}
      {sorted.map((event, i) => {
        const isActive = event.recoveryDate == null;
        const ddIntensity = Math.min(Math.abs(event.maxDrawdown) / 30, 1);

        return (
          <div
            key={i}
            className="grid grid-cols-[0.3fr_1fr_1fr_1fr_0.8fr_0.7fr_0.7fr_0.6fr] gap-1 px-1 py-1.5 border-b border-border/8 hover:bg-white/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono text-neutral/30">{i + 1}</span>
            <span className="text-[9px] font-mono text-neutral/60">{formatDate(event.peakDate)}</span>
            <span className="text-[9px] font-mono text-neutral/60">{formatDate(event.troughDate)}</span>
            <span className="text-[9px] font-mono text-neutral/60">
              {event.recoveryDate ? formatDate(event.recoveryDate) : '--'}
            </span>
            <span
              className="text-[9px] font-mono font-bold text-right"
              style={{ color: `rgba(244,63,94,${0.4 + ddIntensity * 0.6})` }}
            >
              {event.maxDrawdown.toFixed(1)}%
            </span>
            <span className="text-[9px] font-mono text-neutral/50 text-right">
              {event.durationDays}d
            </span>
            <span className="text-[9px] font-mono text-neutral/50 text-right">
              {event.recoveryDays != null ? `${event.recoveryDays}d` : '--'}
            </span>
            <span className="text-right">
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[7px] font-black font-mono uppercase tracking-wider ${
                  isActive
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {isActive ? (t('ddActive') ?? 'Active') : (t('ddRecovered') ?? 'OK')}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Utility ──

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function ddColor(dd: number): string {
  if (dd >= -5) return 'text-amber-400';
  if (dd >= -10) return 'text-orange-400';
  if (dd >= -20) return 'text-rose-400';
  return 'text-red-500';
}
