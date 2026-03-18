import { useState, useMemo, useCallback } from 'react';
import {
  useBacktest,
  type BacktestParams,
  type BacktestResult,
  type BacktestTrade,
  type BacktestEquityPoint,
  type BacktestMetrics,
  type BacktestBuyHold,
  type BacktestMonthlyReturn,
} from '../../api/hooks/use-backtest';
import { useT } from '../../i18n';
import { FlaskConical, Play, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

// ── Constants ──

const STRATEGIES = [
  { value: 'sma-cross', label: 'SMA Cross' },
  { value: 'rsi', label: 'RSI' },
  { value: 'macd', label: 'MACD' },
  { value: 'bollinger', label: 'Bollinger' },
] as const;

interface ParamDef {
  key: string;
  label: string;
  default: number;
  min: number;
  max: number;
  step: number;
}

const STRATEGY_PARAMS: Record<string, ParamDef[]> = {
  'sma-cross': [
    { key: 'fast', label: 'Fast Period', default: 20, min: 2, max: 200, step: 1 },
    { key: 'slow', label: 'Slow Period', default: 50, min: 5, max: 500, step: 1 },
  ],
  'rsi': [
    { key: 'period', label: 'Period', default: 14, min: 2, max: 100, step: 1 },
    { key: 'oversold', label: 'Oversold', default: 30, min: 5, max: 50, step: 1 },
    { key: 'overbought', label: 'Overbought', default: 70, min: 50, max: 95, step: 1 },
  ],
  'macd': [
    { key: 'fast', label: 'Fast', default: 12, min: 2, max: 50, step: 1 },
    { key: 'slow', label: 'Slow', default: 26, min: 5, max: 100, step: 1 },
    { key: 'signal', label: 'Signal', default: 9, min: 2, max: 50, step: 1 },
  ],
  'bollinger': [
    { key: 'period', label: 'Period', default: 20, min: 5, max: 100, step: 1 },
    { key: 'stdDev', label: 'Std Dev', default: 2, min: 0.5, max: 4, step: 0.1 },
  ],
};

function defaultDates(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 2);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getDefaultParams(strategy: string): Record<string, number> {
  const defs = STRATEGY_PARAMS[strategy] ?? [];
  const result: Record<string, number> = {};
  for (const d of defs) result[d.key] = d.default;
  return result;
}

// ── Main Panel ──

export function BacktestPanel() {
  const t = useT();
  const tr = (key: string, fallback: string): string => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };

  const dates = useMemo(() => defaultDates(), []);

  const [symbol, setSymbol] = useState('SPY');
  const [strategy, setStrategy] = useState('sma-cross');
  const [params, setParams] = useState<Record<string, number>>(() => getDefaultParams('sma-cross'));
  const [startDate, setStartDate] = useState(dates.start);
  const [endDate, setEndDate] = useState(dates.end);
  const [config, setConfig] = useState<BacktestParams | null>(null);

  const { data, isLoading, error } = useBacktest(config);

  const handleStrategyChange = useCallback((newStrategy: string) => {
    setStrategy(newStrategy);
    setParams(getDefaultParams(newStrategy));
  }, []);

  const handleParamChange = useCallback((key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleRun = useCallback(() => {
    const trimmed = symbol.trim().toUpperCase();
    if (!trimmed) return;
    setConfig({
      symbol: trimmed,
      strategy,
      params,
      startDate,
      endDate,
    });
  }, [symbol, strategy, params, startDate, endDate]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleRun();
    },
    [handleRun],
  );

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr('panelBacktest', 'STRATEGY BACKTESTER')}
          </span>
        </div>
        {isLoading && (
          <span className="text-[8px] font-mono text-rose-400 animate-pulse uppercase tracking-wider">
            {tr('btRunning', 'Running...')}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="px-3 py-2 border-b border-border/20 shrink-0 space-y-2">
        {/* Row 1: Symbol, Strategy, Dates, Run */}
        <div className="flex items-end gap-2 flex-wrap">
          <div>
            <label className="block text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {tr('btSymbol', 'Symbol')}
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="SPY"
              className="w-20 px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[10px] font-mono text-white placeholder:text-neutral/30 focus:outline-none focus:border-rose-400/40"
            />
          </div>

          <div>
            <label className="block text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {tr('btStrategy', 'Strategy')}
            </label>
            <select
              value={strategy}
              onChange={(e) => handleStrategyChange(e.target.value)}
              className="px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[10px] font-mono text-white focus:outline-none focus:border-rose-400/40 appearance-none cursor-pointer"
            >
              {STRATEGIES.map((s) => (
                <option key={s.value} value={s.value} className="bg-black">
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {tr('btStart', 'Start')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[10px] font-mono text-white focus:outline-none focus:border-rose-400/40"
            />
          </div>

          <div>
            <label className="block text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {tr('btEnd', 'End')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[10px] font-mono text-white focus:outline-none focus:border-rose-400/40"
            />
          </div>

          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-[9px] font-black font-mono uppercase text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40"
          >
            <Play className="w-3 h-3" />
            {tr('btRun', 'Run Backtest')}
          </button>
        </div>

        {/* Row 2: Strategy parameters */}
        <div className="flex items-end gap-3">
          {(STRATEGY_PARAMS[strategy] ?? []).map((def) => (
            <div key={def.key}>
              <label className="block text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
                {def.label}
              </label>
              <input
                type="number"
                value={params[def.key] ?? def.default}
                onChange={(e) => handleParamChange(def.key, Number(e.target.value))}
                min={def.min}
                max={def.max}
                step={def.step}
                className="w-16 px-1.5 py-1 bg-white/[0.03] border border-border/20 text-[10px] font-mono text-white focus:outline-none focus:border-rose-400/40"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('btLoading', 'Running backtest...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-rose-500 text-[9px] font-mono uppercase">
            {tr('btError', 'Failed to run backtest')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr('btEmpty', 'Configure strategy and click Run Backtest')}
          </div>
        )}

        {data && (
          <>
            <MetricsSummary metrics={data.metrics} buyHold={data.buyHold} tr={tr} />
            <EquityCurveChart equity={data.equity} trades={data.trades} bars={data} tr={tr} />
            <MonthlyReturnsGrid monthlyReturns={data.monthlyReturns} tr={tr} />
            <TradeLog trades={data.trades} tr={tr} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Metrics Summary ──

function MetricsSummary({
  metrics,
  buyHold,
  tr,
}: {
  metrics: BacktestMetrics;
  buyHold: BacktestBuyHold;
  tr: (key: string, fallback: string) => string;
}) {
  const items = [
    {
      label: tr('btTotalReturn', 'Total Return'),
      value: `${metrics.totalReturn > 0 ? '+' : ''}${metrics.totalReturn.toFixed(1)}%`,
      color: metrics.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400',
      sub: `vs B&H: ${buyHold.totalReturn > 0 ? '+' : ''}${buyHold.totalReturn.toFixed(1)}%`,
    },
    {
      label: tr('btAnnReturn', 'Ann. Return'),
      value: `${metrics.annReturn > 0 ? '+' : ''}${metrics.annReturn.toFixed(1)}%`,
      color: metrics.annReturn >= 0 ? 'text-emerald-400' : 'text-rose-400',
    },
    {
      label: tr('btMaxDD', 'Max Drawdown'),
      value: `${metrics.maxDrawdown.toFixed(1)}%`,
      color: metrics.maxDrawdown >= -10 ? 'text-amber-400' : 'text-rose-400',
      sub: `B&H: ${buyHold.maxDrawdown.toFixed(1)}%`,
    },
    {
      label: tr('btSharpe', 'Sharpe'),
      value: metrics.sharpe.toFixed(2),
      color: metrics.sharpe >= 1 ? 'text-emerald-400' : metrics.sharpe >= 0.5 ? 'text-amber-400' : 'text-rose-400',
      sub: `B&H: ${buyHold.sharpe.toFixed(2)}`,
    },
    {
      label: tr('btWinRate', 'Win Rate'),
      value: `${metrics.winRate.toFixed(0)}%`,
      color: metrics.winRate >= 55 ? 'text-emerald-400' : metrics.winRate >= 45 ? 'text-amber-400' : 'text-rose-400',
    },
    {
      label: tr('btProfitFactor', 'Profit Factor'),
      value: metrics.profitFactor === Infinity ? 'INF' : metrics.profitFactor.toFixed(2),
      color: metrics.profitFactor >= 1.5 ? 'text-emerald-400' : metrics.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400',
    },
    {
      label: tr('btTotalTrades', 'Total Trades'),
      value: String(metrics.totalTrades),
      color: 'text-neutral/70',
    },
    {
      label: tr('btAvgHold', 'Avg Hold'),
      value: `${metrics.avgHoldDays}d`,
      color: 'text-neutral/70',
    },
  ];

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('btMetrics', 'Performance Metrics')}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {items.map((item) => (
          <div key={item.label} className="bg-white/[0.02] px-2 py-1.5 border border-border/10">
            <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className={`text-[13px] font-black font-mono ${item.color}`}>{item.value}</div>
            {item.sub && (
              <div className="text-[6px] font-mono text-neutral/25 mt-0.5">{item.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Equity Curve Chart ──

function EquityCurveChart({
  equity,
  trades,
  bars,
  tr,
}: {
  equity: BacktestEquityPoint[];
  trades: BacktestTrade[];
  bars: BacktestResult;
  tr: (key: string, fallback: string) => string;
}) {
  // Downsample if too many points
  const displayEquity = useMemo(() => {
    if (equity.length <= 1200) return equity;
    const step = Math.ceil(equity.length / 1200);
    const result: BacktestEquityPoint[] = [];
    for (let i = 0; i < equity.length; i += step) {
      result.push(equity[i]);
    }
    if (result[result.length - 1] !== equity[equity.length - 1]) {
      result.push(equity[equity.length - 1]);
    }
    return result;
  }, [equity]);

  // Compute buy & hold equity line
  const buyHoldEquity = useMemo(() => {
    if (equity.length === 0) return [];
    const firstPrice = bars.equity[0]?.value ?? 10000;
    // Reconstruct buy & hold from the first equity value and buy&hold total return
    const bhReturn = bars.buyHold.totalReturn / 100;
    const points: BacktestEquityPoint[] = [];
    // We need to interpolate linearly between start and end since we don't have daily B&H data
    // Better: use the equity dates and scale
    const startVal = firstPrice;
    const endVal = firstPrice * (1 + bhReturn);
    const n = displayEquity.length;
    for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0;
      points.push({
        date: displayEquity[i].date,
        value: startVal + t * (endVal - startVal),
      });
    }
    return points;
  }, [displayEquity, bars.buyHold.totalReturn, bars.equity]);

  const W = 800;
  const H = 240;
  const PAD_L = 55;
  const PAD_R = 12;
  const PAD_T = 16;
  const PAD_B = 28;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Y range
  const allValues = useMemo(() => {
    const vals = displayEquity.map((p) => p.value);
    for (const p of buyHoldEquity) vals.push(p.value);
    return vals;
  }, [displayEquity, buyHoldEquity]);

  const minY = useMemo(() => Math.min(...allValues) * 0.95, [allValues]);
  const maxY = useMemo(() => Math.max(...allValues) * 1.05, [allValues]);
  const yRange = maxY - minY || 1;

  const scaleX = useCallback(
    (i: number) => PAD_L + (i / Math.max(displayEquity.length - 1, 1)) * chartW,
    [displayEquity.length, chartW],
  );
  const scaleY = useCallback(
    (v: number) => PAD_T + chartH - ((v - minY) / yRange) * chartH,
    [minY, yRange, chartH],
  );

  // Strategy equity path
  const strategyPath = useMemo(() => {
    return displayEquity
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scaleY(pt.value)}`)
      .join(' ');
  }, [displayEquity, scaleX, scaleY]);

  // Buy & hold path
  const bhPath = useMemo(() => {
    return buyHoldEquity
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)},${scaleY(pt.value)}`)
      .join(' ');
  }, [buyHoldEquity, scaleX, scaleY]);

  // Drawdown shading (area below equity where it drops from local peak)
  const drawdownArea = useMemo(() => {
    if (displayEquity.length < 2) return '';
    let peak = displayEquity[0].value;
    const segments: string[] = [];
    let inDD = false;
    let ddStart = 0;

    for (let i = 0; i < displayEquity.length; i++) {
      const v = displayEquity[i].value;
      if (v >= peak) {
        if (inDD) {
          // Close drawdown area
          segments.push(`L ${scaleX(i)},${scaleY(peak)}`);
          inDD = false;
        }
        peak = v;
      } else {
        if (!inDD) {
          ddStart = i - 1;
          segments.push(`M ${scaleX(Math.max(0, ddStart))},${scaleY(peak)}`);
          segments.push(`L ${scaleX(Math.max(0, ddStart))},${scaleY(displayEquity[Math.max(0, ddStart)].value)}`);
          inDD = true;
        }
        segments.push(`L ${scaleX(i)},${scaleY(v)}`);
      }
    }
    if (inDD) {
      const lastI = displayEquity.length - 1;
      segments.push(`L ${scaleX(lastI)},${scaleY(peak)}`);
    }
    return segments.join(' ');
  }, [displayEquity, scaleX, scaleY]);

  // Trade markers
  const tradeMarkers = useMemo(() => {
    const dateIndexMap = new Map<string, number>();
    for (let i = 0; i < displayEquity.length; i++) {
      dateIndexMap.set(displayEquity[i].date, i);
    }

    const markers: Array<{ x: number; y: number; type: 'entry' | 'exit'; pnlPct: number }> = [];
    for (const trade of trades) {
      const entryIdx = dateIndexMap.get(trade.entryDate);
      const exitIdx = dateIndexMap.get(trade.exitDate);

      if (entryIdx != null) {
        markers.push({
          x: scaleX(entryIdx),
          y: scaleY(displayEquity[entryIdx].value),
          type: 'entry',
          pnlPct: trade.pnlPct,
        });
      }
      if (exitIdx != null) {
        markers.push({
          x: scaleX(exitIdx),
          y: scaleY(displayEquity[exitIdx].value),
          type: 'exit',
          pnlPct: trade.pnlPct,
        });
      }
    }
    return markers;
  }, [trades, displayEquity, scaleX, scaleY]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = yRange / 5;
    for (let i = 0; i <= 5; i++) {
      ticks.push(minY + step * i);
    }
    return ticks;
  }, [minY, yRange]);

  // X-axis labels
  const xLabels = useMemo(() => {
    if (displayEquity.length < 2) return [];
    const labels: Array<{ x: number; label: string }> = [];
    const count = Math.min(6, displayEquity.length);
    const step = Math.floor(displayEquity.length / count);
    for (let i = 0; i < displayEquity.length; i += step) {
      labels.push({
        x: scaleX(i),
        label: displayEquity[i].date.slice(0, 7),
      });
    }
    return labels;
  }, [displayEquity, scaleX]);

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40">
          {tr('btEquityCurve', 'Equity Curve')}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-rose-400" />
            <span className="text-[7px] font-mono text-neutral/40">{tr('btStrategy', 'Strategy')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-neutral/30 border-t border-dashed border-neutral/30" />
            <span className="text-[7px] font-mono text-neutral/40">{tr('btBuyHold', 'Buy & Hold')}</span>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="bt-dd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(244,63,94,0.02)" />
            <stop offset="100%" stopColor="rgba(244,63,94,0.12)" />
          </linearGradient>
        </defs>

        {/* Y-axis grid */}
        {yTicks.map((v, i) => {
          const y = scaleY(v);
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={y}
                x2={W - PAD_R}
                y2={y}
                stroke="rgba(255,255,255,0.05)"
                strokeDasharray="3,3"
              />
              <text
                x={PAD_L - 6}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={7}
                fontFamily="monospace"
              >
                ${Math.round(v).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
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

        {/* Drawdown shading */}
        {drawdownArea && <path d={drawdownArea} fill="url(#bt-dd-grad)" opacity={0.6} />}

        {/* Buy & hold line (dashed gray) */}
        {bhPath && (
          <path
            d={bhPath}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={1}
            strokeDasharray="4,3"
          />
        )}

        {/* Strategy equity line */}
        {strategyPath && (
          <path d={strategyPath} fill="none" stroke="#f43f5e" strokeWidth={1.5} opacity={0.9} />
        )}

        {/* Trade markers */}
        {tradeMarkers.map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r={2.5}
            fill={m.type === 'entry' ? '#22c55e' : m.pnlPct >= 0 ? '#22c55e' : '#ef4444'}
            opacity={0.7}
          />
        ))}

        {/* $10k reference line */}
        <line
          x1={PAD_L}
          y1={scaleY(10000)}
          x2={W - PAD_R}
          y2={scaleY(10000)}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={0.5}
          strokeDasharray="2,2"
        />
      </svg>
    </div>
  );
}

// ── Monthly Returns Grid ──

function MonthlyReturnsGrid({
  monthlyReturns,
  tr,
}: {
  monthlyReturns: BacktestMonthlyReturn[];
  tr: (key: string, fallback: string) => string;
}) {
  if (monthlyReturns.length === 0) return null;

  // Group by year
  const yearMap = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    for (const mr of monthlyReturns) {
      const [year, month] = mr.month.split('-');
      if (!map.has(year)) map.set(year, new Map());
      map.get(year)!.set(month, mr.return);
    }
    return map;
  }, [monthlyReturns]);

  const years = useMemo(() => [...yearMap.keys()].sort(), [yearMap]);
  const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="px-3 py-3 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-widest text-neutral/40 mb-2">
        {tr('btMonthlyReturns', 'Monthly Returns')}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider text-left px-1 py-0.5">
                {tr('btYear', 'Year')}
              </th>
              {monthLabels.map((m) => (
                <th key={m} className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider text-center px-0.5 py-0.5">
                  {m}
                </th>
              ))}
              <th className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider text-center px-1 py-0.5">
                {tr('btYTD', 'YTD')}
              </th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              const yearData = yearMap.get(year)!;
              const ytd = Array.from(yearData.values()).reduce((sum, r) => {
                return (1 + sum / 100) * (1 + r / 100) * 100 - 100;
              }, 0);
              return (
                <tr key={year} className="border-t border-border/8">
                  <td className="text-[8px] font-mono font-bold text-neutral/50 px-1 py-0.5">
                    {year}
                  </td>
                  {months.map((m) => {
                    const val = yearData.get(m);
                    return (
                      <td key={m} className="text-center px-0.5 py-0.5">
                        {val != null ? (
                          <span
                            className={`text-[8px] font-mono ${
                              val > 0 ? 'text-emerald-400' : val < 0 ? 'text-rose-400' : 'text-neutral/30'
                            }`}
                          >
                            {val > 0 ? '+' : ''}{val.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono text-neutral/15">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="text-center px-1 py-0.5">
                    <span
                      className={`text-[8px] font-mono font-bold ${
                        ytd > 0 ? 'text-emerald-400' : ytd < 0 ? 'text-rose-400' : 'text-neutral/30'
                      }`}
                    >
                      {ytd > 0 ? '+' : ''}{ytd.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Trade Log ──

type SortField = 'entryDate' | 'pnlPct' | 'holdingDays';
type SortDir = 'asc' | 'desc';

function TradeLog({
  trades,
  tr,
}: {
  trades: BacktestTrade[];
  tr: (key: string, fallback: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [sortField, setSortField] = useState<SortField>('entryDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField],
  );

  const sorted = useMemo(() => {
    const arr = [...trades];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortField) {
        case 'entryDate':
          return dir * a.entryDate.localeCompare(b.entryDate);
        case 'pnlPct':
          return dir * (a.pnlPct - b.pnlPct);
        case 'holdingDays':
          return dir * (a.holdingDays - b.holdingDays);
        default:
          return 0;
      }
    });
    return arr;
  }, [trades, sortField, sortDir]);

  if (trades.length === 0) {
    return (
      <div className="px-3 py-4 text-center text-neutral/30 text-[9px] font-mono uppercase">
        {tr('btNoTrades', 'No trades generated')}
      </div>
    );
  }

  return (
    <div className="px-3 py-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 mb-2 text-[8px] font-black uppercase tracking-widest text-neutral/40 hover:text-rose-400 transition-colors"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {tr('btTradeLog', 'Trade Log')} ({trades.length})
      </button>

      {expanded && (
        <>
          {/* Header */}
          <div className="grid grid-cols-[1fr_0.8fr_1fr_0.8fr_0.7fr_0.5fr] gap-1 px-1 py-1 border-b border-border/15">
            <SortHeader label={tr('btEntry', 'Entry')} field="entryDate" current={sortField} dir={sortDir} onSort={toggleSort} />
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
              {tr('btEntryPx', 'Entry $')}
            </span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">
              {tr('btExit', 'Exit')}
            </span>
            <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">
              {tr('btExitPx', 'Exit $')}
            </span>
            <SortHeader label={tr('btPnl', 'P&L%')} field="pnlPct" current={sortField} dir={sortDir} onSort={toggleSort} />
            <SortHeader label={tr('btDays', 'Days')} field="holdingDays" current={sortField} dir={sortDir} onSort={toggleSort} />
          </div>

          {/* Rows */}
          {sorted.map((trade, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_0.8fr_1fr_0.8fr_0.7fr_0.5fr] gap-1 px-1 py-1.5 border-b border-border/8 hover:bg-white/[0.02] transition-colors ${
                trade.pnlPct >= 0 ? 'bg-emerald-500/[0.02]' : 'bg-rose-500/[0.02]'
              }`}
            >
              <span className="text-[9px] font-mono text-neutral/60">{trade.entryDate}</span>
              <span className="text-[9px] font-mono text-neutral/60 text-right">
                {trade.entryPrice.toFixed(2)}
              </span>
              <span className="text-[9px] font-mono text-neutral/60">{trade.exitDate}</span>
              <span className="text-[9px] font-mono text-neutral/60 text-right">
                {trade.exitPrice.toFixed(2)}
              </span>
              <span
                className={`text-[9px] font-mono font-bold text-right ${
                  trade.pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {trade.pnlPct > 0 ? '+' : ''}{trade.pnlPct.toFixed(1)}%
              </span>
              <span className="text-[9px] font-mono text-neutral/50 text-right">
                {trade.holdingDays}d
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Sort Header ──

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const isActive = field === current;

  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-left ${
        isActive ? 'text-rose-400' : 'text-neutral/40 hover:text-neutral/60'
      } transition-colors`}
    >
      {label}
      <ArrowUpDown className={`w-2 h-2 ${isActive ? 'text-rose-400' : 'text-neutral/20'}`} />
      {isActive && (
        <span className="text-[6px]">{dir === 'asc' ? 'ASC' : 'DESC'}</span>
      )}
    </button>
  );
}
