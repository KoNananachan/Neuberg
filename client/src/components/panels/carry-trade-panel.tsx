import { useMemo } from 'react';
import {
  useCarryTrade,
  type CarryTradeData,
  type CarryPairData,
  type YieldDifferential,
  type CarryTradeSummary,
} from '../../api/hooks/use-carry-trade';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtSpot(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRatio(n: number): string {
  return n.toFixed(3);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalColor(signal: string): { text: string; bg: string } {
  if (signal === 'attractive') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30' };
  if (signal === 'dangerous') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
}

function trendColor(trend: string): string {
  if (trend === 'favorable') return 'text-green-400';
  if (trend === 'adverse') return 'text-red-400';
  return 'text-yellow-400';
}

function riskColor(risk: string): string {
  if (risk === 'low') return 'text-green-400';
  if (risk === 'high') return 'text-red-400';
  return 'text-yellow-400';
}

function envColor(env: string): { text: string; bg: string } {
  if (env === 'favorable') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (env === 'hostile') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

function directionArrow(dir: string): { symbol: string; color: string } {
  if (dir === 'widening') return { symbol: '\u2191', color: 'text-green-400' };
  if (dir === 'narrowing') return { symbol: '\u2193', color: 'text-red-400' };
  return { symbol: '\u2192', color: 'text-neutral-500' };
}

// ── Main Panel ──

export function CarryTradePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCarryTrade();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-500">
            {tr(t, 'ctTitle', 'Carry Trade Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <EnvironmentBadge environment={data.summary.environment} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'ctNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryMetrics summary={data.summary} t={t} />
            <CarryTable pairs={data.pairs} t={t} />
            <YieldDifferentialsSection differentials={data.yieldDifferentials} t={t} />
            <NarrativeSection narrative={data.summary.narrative} timestamp={data.timestamp} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Environment Badge ──

function EnvironmentBadge({
  environment,
  t,
}: {
  environment: CarryTradeSummary['environment'];
  t: ReturnType<typeof useT>;
}) {
  const style = envColor(environment);
  const label = environment === 'favorable'
    ? tr(t, 'ctFavorable', 'Favorable')
    : environment === 'hostile'
      ? tr(t, 'ctHostile', 'Hostile')
      : tr(t, 'ctNeutral', 'Neutral');

  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${style.text} ${style.bg}`}>
      {label}
    </span>
  );
}

// ── Summary Metrics Row ──

function SummaryMetrics({
  summary,
  t,
}: {
  summary: CarryTradeSummary;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'ctG10CarryVol', 'G10 Carry/Vol'),
      value: fmtRatio(summary.g10Carry),
      color: summary.g10Carry >= 0.3 ? 'text-green-400' : summary.g10Carry >= 0.15 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'ctEMCarryVol', 'EM Carry/Vol'),
      value: fmtRatio(summary.emCarry),
      color: summary.emCarry >= 0.4 ? 'text-green-400' : summary.emCarry >= 0.2 ? 'text-yellow-400' : 'text-red-400',
    },
    {
      label: tr(t, 'ctJPYStatus', 'JPY Status'),
      value: summary.yenStatus,
      color: summary.yenStatus.includes('Weak') ? 'text-green-400' : summary.yenStatus.includes('Strong') ? 'text-red-400' : 'text-yellow-400',
    },
    {
      label: tr(t, 'ctEnvironment', 'Environment'),
      value: summary.environment.toUpperCase(),
      color: envColor(summary.environment).text,
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color} truncate`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Carry Opportunity Table ──

function CarryTable({
  pairs,
  t,
}: {
  pairs: CarryPairData[];
  t: ReturnType<typeof useT>;
}) {
  const g10Pairs = useMemo(() => pairs.filter((p) => p.category === 'g10'), [pairs]);
  const emPairs = useMemo(() => pairs.filter((p) => p.category === 'em'), [pairs]);
  const maxCarryToVol = useMemo(
    () => Math.max(...pairs.map((p) => p.carryToVol), 0.01),
    [pairs],
  );

  return (
    <div className="border-b border-border/20">
      {/* G10 Section */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-500" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ctG10Carry', 'G10 Carry')}
        </span>
      </div>
      <TableHeader t={t} />
      {g10Pairs.map((pair) => (
        <CarryRow key={pair.symbol} pair={pair} maxCarryToVol={maxCarryToVol} />
      ))}

      {/* EM Section */}
      <div className="px-3 py-1 border-b border-border/10 border-t border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-yellow-500" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ctEMCarry', 'EM Carry')}
        </span>
      </div>
      <TableHeader t={t} />
      {emPairs.map((pair) => (
        <CarryRow key={pair.symbol} pair={pair} maxCarryToVol={maxCarryToVol} />
      ))}
    </div>
  );
}

function TableHeader({ t }: { t: ReturnType<typeof useT> }) {
  return (
    <div className="grid grid-cols-[80px_64px_48px_48px_44px_60px_48px_40px_56px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
      <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'ctPair', 'Pair')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'ctSpot', 'Spot')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'ctChg', 'Chg%')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'ctCarry', 'Carry')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'ctVol', 'Vol')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'ctCtoV', 'C/V')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'ctTrend', 'Trend')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'ctRisk', 'Risk')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'ctSignal', 'Signal')}</span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">{tr(t, 'ct20d', '20D')}</span>
    </div>
  );
}

function CarryRow({
  pair,
  maxCarryToVol,
}: {
  pair: CarryPairData;
  maxCarryToVol: number;
}) {
  const signal = signalColor(pair.signal);
  const barWidth = maxCarryToVol > 0 ? (pair.carryToVol / maxCarryToVol) * 100 : 0;

  return (
    <div className="grid grid-cols-[80px_64px_48px_48px_44px_60px_48px_40px_56px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors items-center">
      {/* Pair name */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] font-mono font-bold text-white">{pair.name}</span>
      </div>

      {/* Spot */}
      <span className="text-[8px] font-mono text-white text-right">{fmtSpot(pair.spot)}</span>

      {/* Change % */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.changePct)}`}>
        {fmtPct(pair.changePct)}
      </span>

      {/* Carry estimate */}
      <span className="text-[8px] font-mono text-green-400/80 text-right">
        {pair.carryEstimate.toFixed(1)}%
      </span>

      {/* Vol */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {pair.vol20d.toFixed(1)}
      </span>

      {/* Carry-to-vol with bar */}
      <div className="flex items-center gap-1 justify-end">
        <div className="w-6 h-[3px] bg-neutral-800 relative">
          <div
            className="absolute left-0 top-0 h-full bg-green-500"
            style={{ width: `${Math.min(barWidth, 100)}%` }}
          />
        </div>
        <span className="text-[8px] font-mono font-bold text-white w-7 text-right">
          {fmtRatio(pair.carryToVol)}
        </span>
      </div>

      {/* Trend */}
      <span className={`text-[7px] font-mono font-bold text-center uppercase ${trendColor(pair.trend)}`}>
        {pair.trend === 'favorable' ? 'FAV' : pair.trend === 'adverse' ? 'ADV' : 'NEU'}
      </span>

      {/* Risk */}
      <span className={`text-[7px] font-mono font-bold text-center uppercase ${riskColor(pair.risk)}`}>
        {pair.risk === 'low' ? 'L' : pair.risk === 'high' ? 'H' : 'M'}
      </span>

      {/* Signal badge */}
      <div className="flex justify-center">
        <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${signal.text} ${signal.bg}`}>
          {pair.signal === 'attractive' ? 'BUY' : pair.signal === 'dangerous' ? 'RISK' : 'HOLD'}
        </span>
      </div>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <MiniSparkline data={pair.sparkline} trend={pair.trend} />
      </div>
    </div>
  );
}

// ── Mini Sparkline (SVG) ──

function MiniSparkline({
  data,
  trend,
}: {
  data: number[];
  trend: 'favorable' | 'neutral' | 'adverse';
}) {
  const path = useMemo(() => {
    if (data.length < 2) return null;
    const W = 48;
    const H = 14;
    const PAD = 1;

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const rangeV = maxV - minV || 0.001;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    return { linePath, W, H };
  }, [data]);

  if (!path) return null;

  const color = trend === 'favorable' ? '#22c55e' : trend === 'adverse' ? '#ef4444' : '#eab308';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={48} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

// ── Yield Differentials Section ──

function YieldDifferentialsSection({
  differentials,
  t,
}: {
  differentials: YieldDifferential[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'ctYieldDiff', 'Yield Differentials')}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-px bg-border/10">
        {differentials.map((d) => {
          const arrow = directionArrow(d.direction);
          return (
            <div key={d.pair} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                {d.pair}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[10px] font-mono font-bold text-white">
                  {d.differential >= 0 ? '+' : ''}{d.differential.toFixed(2)}%
                </span>
                <span className={`text-[9px] font-mono font-bold ${arrow.color}`}>
                  {arrow.symbol}
                </span>
              </div>
              <div className={`text-[7px] font-mono uppercase ${arrow.color}`}>
                {d.direction}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Narrative Section ──

function NarrativeSection({
  narrative,
  timestamp,
  t,
}: {
  narrative: string;
  timestamp: string;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="px-3 py-2">
      <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
        {tr(t, 'ctAnalysis', 'Analysis')}
      </div>
      <p className="text-[8px] font-mono text-neutral-400 leading-relaxed">
        {narrative}
      </p>
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'ctLastUpdate', 'Last update')}: {new Date(timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
