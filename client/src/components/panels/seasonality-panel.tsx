import { useState, useMemo } from 'react';
import { useSeasonality, type SeasonalityData, type MonthlyEntry, type WeekdayEntry, type YearMonthEntry } from '../../api/hooks/use-seasonality';
import { useT } from '../../i18n';
import { RefreshCw, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

// ── i18n fallback helper ──
function makeTr(t: ReturnType<typeof useT>) {
  return (key: string, fallback: string): string => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

// ── Tab definitions ──
type TabId = 'monthly' | 'heatmap' | 'weekday';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'monthly', label: 'Monthly Returns' },
  { id: 'heatmap', label: 'Heatmap' },
  { id: 'weekday', label: 'Day of Week' },
];

const YEAR_OPTIONS = [5, 10, 20] as const;

// ── Main Panel ──

export function SeasonalityPanel() {
  const t = useT();
  const tr = makeTr(t);

  const [symbol, setSymbol] = useState('SPY');
  const [inputValue, setInputValue] = useState('SPY');
  const [years, setYears] = useState<number>(10);
  const [activeTab, setActiveTab] = useState<TabId>('monthly');

  const { data, isLoading, refetch } = useSeasonality(symbol, years);

  const handleSubmit = () => {
    const cleaned = inputValue.trim().toUpperCase();
    if (cleaned && cleaned !== symbol) {
      setSymbol(cleaned);
    }
  };

  const currentMonth = new Date().getMonth(); // 0-indexed

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr('panelSeasonality', 'Seasonality')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-emerald-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        {/* Symbol input */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            onBlur={handleSubmit}
            className="w-16 bg-white/[0.03] border border-border/20 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white uppercase outline-none focus:border-emerald-500/40"
            placeholder="SYMBOL"
          />
        </div>

        {/* Years selector */}
        <div className="flex items-center gap-0.5">
          {YEAR_OPTIONS.map((y) => (
            <button
              key={y}
              onClick={() => setYears(y)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase transition-colors ${
                years === y
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral/40 hover:text-white border border-transparent'
              }`}
            >
              {y}Y
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 ml-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-colors ${
                activeTab === tab.id
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'text-neutral/40 hover:text-white border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr('seasonalityNoData', 'No seasonality data available')}
          </div>
        )}

        {data && (
          <>
            {activeTab === 'monthly' && <MonthlyReturnsTab data={data} currentMonth={currentMonth} />}
            {activeTab === 'heatmap' && <HeatmapTab data={data} currentMonth={currentMonth} />}
            {activeTab === 'weekday' && <WeekdayTab data={data} />}
            <SummaryRow data={data} currentMonth={currentMonth} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Monthly Returns Bar Chart ──

function MonthlyReturnsTab({ data, currentMonth }: { data: SeasonalityData; currentMonth: number }) {
  const t = useT();
  const tr = makeTr(t);

  const { monthly } = data;

  const maxAbs = useMemo(() => {
    const absVals = monthly.map((m) => Math.abs(m.avgReturn));
    return Math.max(...absVals, 0.5);
  }, [monthly]);

  const W = 340;
  const H = 180;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 20;
  const PAD_B = 35;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW = chartW / 12;
  const zeroY = PAD_T + (maxAbs / (maxAbs * 2)) * chartH;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = maxAbs > 3 ? 2 : maxAbs > 1.5 ? 1 : 0.5;
    const ticks: number[] = [];
    for (let v = -Math.ceil(maxAbs / step) * step; v <= Math.ceil(maxAbs / step) * step; v += step) {
      if (Math.abs(v) <= maxAbs * 1.1) ticks.push(v);
    }
    return ticks;
  }, [maxAbs]);

  const scaleY = (v: number) => PAD_T + ((maxAbs - v) / (maxAbs * 2)) * chartH;

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('seasonalityMonthlyAvg', 'Average Monthly Returns')} ({data.symbol} — {data.dataYears}Y)
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 220 }}>
        {/* Y-axis grid lines */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
              strokeDasharray={v === 0 ? undefined : '2,2'}
            />
            <text
              x={PAD_L - 3} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
            >
              {v.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Bars */}
        {monthly.map((m, i) => {
          const x = PAD_L + i * barW;
          const barHeight = Math.abs(m.avgReturn) / (maxAbs * 2) * chartH;
          const y = m.avgReturn >= 0 ? zeroY - barHeight : zeroY;
          const isCurrentMonth = i === currentMonth;
          const fillColor = m.avgReturn >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
          const strokeColor = isCurrentMonth
            ? (m.avgReturn >= 0 ? '#34d399' : '#f87171')
            : 'transparent';

          return (
            <g key={m.month}>
              {/* Bar */}
              <rect
                x={x + 2}
                y={y}
                width={barW - 4}
                height={Math.max(barHeight, 1)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isCurrentMonth ? 1.5 : 0}
              />
              {/* Value label */}
              <text
                x={x + barW / 2}
                y={m.avgReturn >= 0 ? y - 3 : y + barHeight + 8}
                textAnchor="middle"
                fill={m.avgReturn >= 0 ? '#34d399' : '#f87171'}
                fontSize={6}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {m.avgReturn >= 0 ? '+' : ''}{m.avgReturn.toFixed(1)}%
              </text>
              {/* Median diamond marker */}
              {m.medianReturn !== 0 && (
                <polygon
                  points={`${x + barW / 2},${scaleY(m.medianReturn) - 2.5} ${x + barW / 2 + 2.5},${scaleY(m.medianReturn)} ${x + barW / 2},${scaleY(m.medianReturn) + 2.5} ${x + barW / 2 - 2.5},${scaleY(m.medianReturn)}`}
                  fill="rgba(255,255,255,0.5)"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth={0.5}
                />
              )}
              {/* Month label */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 10}
                textAnchor="middle"
                fill={isCurrentMonth ? '#34d399' : 'rgba(255,255,255,0.35)'}
                fontSize={7}
                fontFamily="monospace"
                fontWeight={isCurrentMonth ? 'bold' : 'normal'}
              >
                {m.name}
              </text>
              {/* Win rate */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 20}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize={5.5}
                fontFamily="monospace"
              >
                {m.winRate.toFixed(0)}%W
              </text>
            </g>
          );
        })}
      </svg>

      {/* Monthly detail table */}
      <div className="mt-2">
        <div className="grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr] gap-0 text-[7px] font-mono text-neutral/40 uppercase tracking-wider border-b border-border/10 pb-1 mb-1">
          <span>{tr('month', 'Month')}</span>
          <span className="text-right">{tr('avgReturn', 'Avg')}</span>
          <span className="text-right">{tr('medianReturn', 'Median')}</span>
          <span className="text-right">{tr('winRate', 'Win%')}</span>
          <span className="text-right">{tr('best', 'Best')}</span>
          <span className="text-right">{tr('worst', 'Worst')}</span>
        </div>
        {monthly.map((m, i) => {
          const isCurrentMonth = i === currentMonth;
          return (
            <div
              key={m.month}
              className={`grid grid-cols-[50px_1fr_1fr_1fr_1fr_1fr] gap-0 py-0.5 border-b border-border/5 ${
                isCurrentMonth ? 'bg-emerald-500/5' : ''
              }`}
            >
              <span className={`text-[8px] font-mono font-bold ${isCurrentMonth ? 'text-emerald-400' : 'text-white'}`}>
                {m.name}
              </span>
              <span className={`text-[8px] font-mono text-right font-bold ${m.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {m.avgReturn >= 0 ? '+' : ''}{m.avgReturn.toFixed(2)}%
              </span>
              <span className={`text-[8px] font-mono text-right ${m.medianReturn >= 0 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {m.medianReturn >= 0 ? '+' : ''}{m.medianReturn.toFixed(2)}%
              </span>
              <span className={`text-[8px] font-mono text-right ${m.winRate >= 50 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {m.winRate.toFixed(0)}%
              </span>
              <span className="text-[7px] font-mono text-right text-emerald-400/50">
                +{m.bestYear.return.toFixed(1)}% ({m.bestYear.year})
              </span>
              <span className="text-[7px] font-mono text-right text-red-400/50">
                {m.worstYear.return.toFixed(1)}% ({m.worstYear.year})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab 2: Heatmap Matrix ──

function HeatmapTab({ data, currentMonth }: { data: SeasonalityData; currentMonth: number }) {
  const t = useT();
  const tr = makeTr(t);

  const { yearMonth } = data;
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Find max absolute return for color scaling
  const maxAbs = useMemo(() => {
    let max = 0;
    for (const ym of yearMonth) {
      for (const r of ym.returns) {
        if (r !== null) {
          max = Math.max(max, Math.abs(r));
        }
      }
    }
    return Math.max(max, 1);
  }, [yearMonth]);

  // Color function: deep red -> white -> deep green
  const cellColor = (val: number | null): string => {
    if (val === null) return 'rgba(255,255,255,0.02)';
    const normalized = Math.max(-1, Math.min(1, val / maxAbs));
    if (normalized >= 0) {
      const intensity = normalized;
      return `rgba(52, 211, 153, ${0.1 + intensity * 0.5})`;
    } else {
      const intensity = -normalized;
      return `rgba(248, 113, 113, ${0.1 + intensity * 0.5})`;
    }
  };

  const textColor = (val: number | null): string => {
    if (val === null) return 'rgba(255,255,255,0.1)';
    return val >= 0 ? 'rgba(52,211,153,0.9)' : 'rgba(248,113,113,0.9)';
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('seasonalityHeatmap', 'Year × Month Heatmap')} ({data.symbol})
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse" style={{ minWidth: 420 }}>
          <thead>
            <tr>
              <th className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider text-left px-1 py-0.5 w-10">
                {tr('year', 'Year')}
              </th>
              {MONTH_LABELS.map((label, i) => (
                <th
                  key={label}
                  className={`text-[7px] font-mono uppercase tracking-wider text-center px-0.5 py-0.5 ${
                    i === currentMonth ? 'text-emerald-400 font-bold' : 'text-neutral/40'
                  }`}
                >
                  {label}
                </th>
              ))}
              <th className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider text-center px-1 py-0.5">
                {tr('total', 'YTD')}
              </th>
            </tr>
          </thead>
          <tbody>
            {yearMonth.map((ym) => {
              const annualReturn = ym.returns.reduce((sum: number, r) => sum + (r ?? 0), 0);
              const isCurrentYear = ym.year === currentYear;
              return (
                <tr key={ym.year} className={isCurrentYear ? 'bg-emerald-500/5' : ''}>
                  <td className={`text-[8px] font-mono font-bold px-1 py-0.5 ${
                    isCurrentYear ? 'text-emerald-400' : 'text-white/70'
                  }`}>
                    {ym.year}
                  </td>
                  {ym.returns.map((ret, mi) => (
                    <td
                      key={mi}
                      className="px-0.5 py-0.5 text-center"
                      style={{ backgroundColor: cellColor(ret) }}
                    >
                      <span
                        className="text-[7px] font-mono font-bold"
                        style={{ color: textColor(ret) }}
                      >
                        {ret !== null ? (ret >= 0 ? '+' : '') + ret.toFixed(1) : '\u2014'}
                      </span>
                    </td>
                  ))}
                  <td className="px-1 py-0.5 text-center" style={{ backgroundColor: cellColor(annualReturn) }}>
                    <span
                      className="text-[8px] font-mono font-bold"
                      style={{ color: textColor(annualReturn) }}
                    >
                      {annualReturn >= 0 ? '+' : ''}{annualReturn.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-2 mt-2">
        <span className="text-[7px] font-mono text-red-400/60">
          -{maxAbs.toFixed(0)}%
        </span>
        <div className="flex h-2 w-32">
          <div className="flex-1" style={{ background: 'linear-gradient(to right, rgba(248,113,113,0.5), rgba(255,255,255,0.05), rgba(52,211,153,0.5))' }} />
        </div>
        <span className="text-[7px] font-mono text-emerald-400/60">
          +{maxAbs.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}

// ── Tab 3: Day-of-Week ──

function WeekdayTab({ data }: { data: SeasonalityData }) {
  const t = useT();
  const tr = makeTr(t);

  const { weekday } = data;

  const maxAbs = useMemo(() => {
    const absVals = weekday.map((w) => Math.abs(w.avgReturn));
    return Math.max(...absVals, 0.01);
  }, [weekday]);

  const W = 280;
  const H = 150;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 15;
  const PAD_B = 35;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const barW = chartW / 5;
  const zeroY = PAD_T + (maxAbs / (maxAbs * 2)) * chartH;

  const scaleY = (v: number) => PAD_T + ((maxAbs - v) / (maxAbs * 2)) * chartH;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = maxAbs > 0.1 ? 0.05 : 0.02;
    const ticks: number[] = [];
    for (let v = -Math.ceil(maxAbs / step) * step; v <= Math.ceil(maxAbs / step) * step; v += step) {
      if (Math.abs(v) <= maxAbs * 1.1) ticks.push(v);
    }
    return ticks;
  }, [maxAbs]);

  const currentDay = new Date().getDay(); // 0=Sun, 1=Mon ... 5=Fri

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('seasonalityWeekday', 'Average Daily Return by Weekday')} ({data.symbol})
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
        {/* Y-axis grid */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
              stroke={v === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)'}
              strokeDasharray={v === 0 ? undefined : '2,2'}
            />
            <text
              x={PAD_L - 3} y={scaleY(v) + 3}
              textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace"
            >
              {v >= 0 ? '+' : ''}{(v * 100).toFixed(0)}bp
            </text>
          </g>
        ))}

        {/* Bars */}
        {weekday.map((w, i) => {
          const x = PAD_L + i * barW;
          const barHeight = Math.abs(w.avgReturn) / (maxAbs * 2) * chartH;
          const y = w.avgReturn >= 0 ? zeroY - barHeight : zeroY;
          const isCurrent = (i + 1) === currentDay;
          const fillColor = w.avgReturn >= 0 ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)';
          const strokeColor = isCurrent
            ? (w.avgReturn >= 0 ? '#34d399' : '#f87171')
            : 'transparent';

          return (
            <g key={w.day}>
              <rect
                x={x + 6}
                y={y}
                width={barW - 12}
                height={Math.max(barHeight, 1)}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={isCurrent ? 1.5 : 0}
              />
              {/* Value */}
              <text
                x={x + barW / 2}
                y={w.avgReturn >= 0 ? y - 3 : y + barHeight + 8}
                textAnchor="middle"
                fill={w.avgReturn >= 0 ? '#34d399' : '#f87171'}
                fontSize={7}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {w.avgReturn >= 0 ? '+' : ''}{w.avgReturn.toFixed(3)}%
              </text>
              {/* Day label */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 10}
                textAnchor="middle"
                fill={isCurrent ? '#34d399' : 'rgba(255,255,255,0.35)'}
                fontSize={8}
                fontFamily="monospace"
                fontWeight={isCurrent ? 'bold' : 'normal'}
              >
                {w.name}
              </text>
              {/* Win rate */}
              <text
                x={x + barW / 2}
                y={H - PAD_B + 20}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize={6}
                fontFamily="monospace"
              >
                {w.winRate.toFixed(0)}%W
              </text>
            </g>
          );
        })}
      </svg>

      {/* Weekday detail rows */}
      <div className="mt-2">
        <div className="grid grid-cols-[60px_1fr_1fr] gap-0 text-[7px] font-mono text-neutral/40 uppercase tracking-wider border-b border-border/10 pb-1 mb-1">
          <span>{tr('day', 'Day')}</span>
          <span className="text-right">{tr('avgReturn', 'Avg Return')}</span>
          <span className="text-right">{tr('winRate', 'Win Rate')}</span>
        </div>
        {weekday.map((w, i) => {
          const isCurrent = (i + 1) === currentDay;
          return (
            <div
              key={w.day}
              className={`grid grid-cols-[60px_1fr_1fr] gap-0 py-0.5 border-b border-border/5 ${
                isCurrent ? 'bg-emerald-500/5' : ''
              }`}
            >
              <span className={`text-[9px] font-mono font-bold ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                {w.name}
              </span>
              <span className={`text-[9px] font-mono text-right font-bold ${w.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {w.avgReturn >= 0 ? '+' : ''}{w.avgReturn.toFixed(4)}%
              </span>
              <span className={`text-[9px] font-mono text-right ${w.winRate >= 50 ? 'text-emerald-400/70' : 'text-red-400/70'}`}>
                {w.winRate.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Stats Row ──

function SummaryRow({ data, currentMonth }: { data: SeasonalityData; currentMonth: number }) {
  const t = useT();
  const tr = makeTr(t);

  const { monthly, sellInMay } = data;

  // Best and worst months
  const sorted = useMemo(() => [...monthly].sort((a, b) => b.avgReturn - a.avgReturn), [monthly]);
  const bestMonth = sorted[0];
  const worstMonth = sorted[sorted.length - 1];
  const currentMonthData = monthly[currentMonth];

  return (
    <div className="px-3 py-3">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('seasonalitySummary', 'Summary Statistics')}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {/* Best month */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">{tr('bestMonth', 'Best Month')}</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-[9px] font-mono font-bold text-emerald-400">
              {bestMonth.name} (+{bestMonth.avgReturn.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Worst month */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">{tr('worstMonth', 'Worst Month')}</span>
          <div className="flex items-center gap-1">
            <TrendingDown className="w-3 h-3 text-red-400" />
            <span className="text-[9px] font-mono font-bold text-red-400">
              {worstMonth.name} ({worstMonth.avgReturn.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Sell-in-May */}
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">May-Oct</span>
          <span className={`text-[9px] font-mono font-bold ${sellInMay.mayOct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {sellInMay.mayOct >= 0 ? '+' : ''}{sellInMay.mayOct.toFixed(1)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">Nov-Apr</span>
          <span className={`text-[9px] font-mono font-bold ${sellInMay.novApr >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {sellInMay.novApr >= 0 ? '+' : ''}{sellInMay.novApr.toFixed(1)}%
          </span>
        </div>

        {/* Sell-in-May differential */}
        <div className="flex items-center justify-between col-span-2 pt-1 border-t border-border/10">
          <span className="text-[8px] font-mono text-neutral/50 uppercase">
            {tr('sellInMayEffect', 'Sell-in-May Effect')}
          </span>
          <span className={`text-[9px] font-mono font-bold ${
            sellInMay.novApr > sellInMay.mayOct ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {sellInMay.novApr > sellInMay.mayOct
              ? `Nov-Apr outperforms by ${(sellInMay.novApr - sellInMay.mayOct).toFixed(1)}%`
              : `May-Oct outperforms by ${(sellInMay.mayOct - sellInMay.novApr).toFixed(1)}%`
            }
          </span>
        </div>

        {/* Current month vs historical */}
        {currentMonthData && (
          <div className="flex items-center justify-between col-span-2 pt-1 border-t border-border/10">
            <span className="text-[8px] font-mono text-neutral/50 uppercase">
              {tr('seasonalityCurrentMonth', 'Current Month Historical')} ({currentMonthData.name})
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-mono font-bold ${currentMonthData.avgReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                Avg: {currentMonthData.avgReturn >= 0 ? '+' : ''}{currentMonthData.avgReturn.toFixed(2)}%
              </span>
              <span className={`text-[8px] font-mono ${currentMonthData.winRate >= 50 ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
                Win: {currentMonthData.winRate.toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
