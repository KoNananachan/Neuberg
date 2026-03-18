import { useMemo, useState } from 'react';
import {
  useInflationBreakeven,
  type InflationBreakevenData,
  type BreakevenEntry,
  type InflationIndicator,
} from '../../api/hooks/use-inflation-breakeven';
import { useT } from '../../i18n';
import { Flame, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type Tab = 'breakevens' | 'indicators' | 'curve';

const FED_TARGET = 2.0;

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

/** For inflation: rising = red (bad), falling = green (good) */
function inflationColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

/** Breakeven color: above target zone = red, below = green */
function breakevenColor(be: number): string {
  if (be > FED_TARGET + 0.5) return 'text-red-400';
  if (be > FED_TARGET) return 'text-yellow-400';
  return 'text-green-400';
}

function trendArrow(trend: string): string {
  if (trend === 'rising') return '\u2191';
  if (trend === 'falling') return '\u2193';
  return '\u2192';
}

function trendColor(trend: string): string {
  // For inflation: rising = red (bad), falling = green (good)
  if (trend === 'rising') return 'text-red-400';
  if (trend === 'falling') return 'text-green-400';
  return 'text-yellow-400';
}

// ── Main Panel ──

export function InflationBreakevenPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useInflationBreakeven();
  const [activeTab, setActiveTab] = useState<Tab>('breakevens');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Flame className="w-3 h-3 text-red-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'ibTitle', 'Inflation Breakevens')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${
                data.fiveYearFiveYear > FED_TARGET + 0.5
                  ? 'text-red-400 bg-red-500/10 border border-red-500/30'
                  : data.fiveYearFiveYear > FED_TARGET
                    ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30'
                    : 'text-green-400 bg-green-500/10 border border-green-500/30'
              }`}
            >
              5Y5Y {fmtRate(data.fiveYearFiveYear)}%
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-px px-2 py-1 border-b border-border/20 shrink-0">
        {(['breakevens', 'indicators', 'curve'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-red-400 border-b border-red-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {tab === 'breakevens'
              ? tr(t, 'ibBreakevens', 'Breakevens')
              : tab === 'indicators'
                ? tr(t, 'ibIndicators', 'Indicators')
                : tr(t, 'ibCurve', 'Curve')}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'ibNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'breakevens' && <BreakevensTab data={data} t={t} />}
        {data && activeTab === 'indicators' && <IndicatorsTab data={data} t={t} />}
        {data && activeTab === 'curve' && <CurveTab data={data} t={t} />}
      </div>
    </div>
  );
}

// ── BREAKEVENS TAB ──

function BreakevensTab({ data, t }: { data: InflationBreakevenData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[36px_52px_52px_52px_36px_36px_36px_60px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibNominal', 'Nominal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibReal', 'Real')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibBE', 'BE')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1D
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1W
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1M
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'ib52W', '52W Range')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'ibSpark', 'Spark')}
        </span>
      </div>

      {/* Table rows */}
      {data.breakevens.map((entry) => (
        <BreakevenRow key={entry.tenor} entry={entry} />
      ))}

      {/* 5Y5Y forward footer */}
      <div className="px-3 py-1.5 border-t border-border/20 flex items-center gap-3">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          5Y5Y Forward Breakeven:
        </span>
        <span className={`text-[8px] font-mono font-bold ${breakevenColor(data.fiveYearFiveYear)}`}>
          {fmtRate(data.fiveYearFiveYear)}%
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          (Fed Target: {FED_TARGET.toFixed(1)}%)
        </span>
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'ibUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function BreakevenRow({ entry }: { entry: BreakevenEntry }) {
  return (
    <div className="grid grid-cols-[36px_52px_52px_52px_36px_36px_36px_60px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center">
      {/* Tenor */}
      <span className="text-[8px] font-mono font-bold text-white">{entry.tenor}</span>

      {/* Nominal yield */}
      <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtRate(entry.nominalYield)}</span>

      {/* Real yield */}
      <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtRate(entry.realYield)}</span>

      {/* Breakeven */}
      <span className={`text-[8px] font-mono font-bold text-right ${breakevenColor(entry.breakeven)}`}>
        {fmtRate(entry.breakeven)}
      </span>

      {/* 1D change (bps) */}
      <span className={`text-[7px] font-mono font-bold text-right ${inflationColor(entry.change1d)}`}>
        {fmtBps(entry.change1d)}
      </span>

      {/* 1W change (bps) */}
      <span className={`text-[7px] font-mono font-bold text-right ${inflationColor(entry.change1w)}`}>
        {fmtBps(entry.change1w)}
      </span>

      {/* 1M change (bps) */}
      <span className={`text-[7px] font-mono font-bold text-right ${inflationColor(entry.change1m)}`}>
        {fmtBps(entry.change1m)}
      </span>

      {/* 52W Range bar */}
      <div className="px-1">
        <RangeBar low={entry.low52w} high={entry.high52w} current={entry.breakeven} percentile={entry.percentile} />
      </div>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <MiniSparkline data={entry.history} />
      </div>
    </div>
  );
}

// ── 52-Week Range Bar ──

function RangeBar({ low, high, current, percentile }: { low: number; high: number; current: number; percentile: number }) {
  const clampedPct = Math.max(0, Math.min(100, percentile));
  const barColor = current > FED_TARGET + 0.5 ? '#ef4444' : current > FED_TARGET ? '#facc15' : '#4ade80';

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[6px] font-mono text-neutral-700 w-5 text-right">{low.toFixed(1)}</span>
      <div className="flex-1 h-[4px] bg-neutral-800 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{
            width: `${clampedPct}%`,
            backgroundColor: barColor,
            opacity: 0.4,
          }}
        />
        <div
          className="absolute top-[-1px] w-[2px] h-[6px]"
          style={{
            left: `${clampedPct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <span className="text-[6px] font-mono text-neutral-700 w-5">{high.toFixed(1)}</span>
    </div>
  );
}

// ── INDICATORS TAB ──

function IndicatorsTab({ data, t }: { data: InflationBreakevenData; t: ReturnType<typeof useT> }) {
  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[100px_48px_48px_44px_32px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibIndicator', 'Indicator')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibValue', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibPrev', 'Prev')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibChg', 'Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'ibTrend', 'Trd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'ibVsTarget', 'vs Tgt')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'ibHistory', '12M')}
        </span>
      </div>

      {/* Indicator rows */}
      {data.indicators.map((indicator) => (
        <IndicatorRow key={indicator.name} indicator={indicator} />
      ))}

      {/* Fed target reference */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <div className="flex items-center gap-2">
          <div className="w-3 h-px border-b border-dashed border-red-400/50" />
          <span className="text-[7px] font-mono text-neutral-600">
            Fed 2% PCE Target
          </span>
        </div>
      </div>

      {/* Timestamp */}
      <div className="px-3 py-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'ibUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function IndicatorRow({ indicator }: { indicator: InflationIndicator }) {
  const vsTarget = indicator.target !== null
    ? indicator.value - indicator.target
    : null;

  return (
    <div className="grid grid-cols-[100px_48px_48px_44px_32px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-red-400/[0.02] transition-colors items-center">
      {/* Name */}
      <span className="text-[8px] font-mono font-bold text-white truncate">{indicator.name}</span>

      {/* Value */}
      <span className={`text-[8px] font-mono font-bold text-right ${
        indicator.target !== null && indicator.value > indicator.target
          ? 'text-red-400'
          : 'text-white'
      }`}>
        {fmtPct(indicator.value)}
      </span>

      {/* Previous */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {fmtPct(indicator.previousValue)}
      </span>

      {/* Change */}
      <span className={`text-[7px] font-mono font-bold text-right ${inflationColor(indicator.change)}`}>
        {fmtChange(indicator.change)}
      </span>

      {/* Trend arrow */}
      <span className={`text-[9px] font-mono font-bold text-center ${trendColor(indicator.trend)}`}>
        {trendArrow(indicator.trend)}
      </span>

      {/* vs Target */}
      <span className="text-[7px] font-mono text-right">
        {vsTarget !== null ? (
          <span className={vsTarget > 0 ? 'text-red-400' : vsTarget < 0 ? 'text-green-400' : 'text-neutral-500'}>
            {vsTarget >= 0 ? '+' : ''}{vsTarget.toFixed(2)}
          </span>
        ) : (
          <span className="text-neutral-700">--</span>
        )}
      </span>

      {/* Sparkline */}
      <div className="flex justify-end pr-1">
        <IndicatorSparkline data={indicator.history} target={indicator.target} />
      </div>
    </div>
  );
}

// ── CURVE TAB ──

function CurveTab({ data, t }: { data: InflationBreakevenData; t: ReturnType<typeof useT> }) {
  const W = 420;
  const H = 260;
  const PAD_L = 42;
  const PAD_R = 20;
  const PAD_T = 20;
  const PAD_B = 30;

  // Collect all rates for Y-axis range
  const allRates = [
    ...data.nominalCurve.map((p) => p.rate),
    ...data.realYieldCurve.map((p) => p.rate),
    ...data.breakevens.map((b) => b.breakeven),
    FED_TARGET,
  ];
  const minRate = Math.min(...allRates) - 0.2;
  const maxRate = Math.max(...allRates) + 0.2;
  const rateRange = maxRate - minRate || 1;

  const tenors = data.nominalCurve.map((p) => p.tenor);
  const tenorPositions = tenors.map((_, i) =>
    PAD_L + (i / Math.max(tenors.length - 1, 1)) * (W - PAD_L - PAD_R),
  );

  const scaleY = (rate: number) =>
    PAD_T + ((maxRate - rate) / rateRange) * (H - PAD_T - PAD_B);

  // Build paths
  const nominalPath = data.nominalCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${tenorPositions[i].toFixed(1)},${scaleY(p.rate).toFixed(1)}`)
    .join(' ');

  const realPath = data.realYieldCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${tenorPositions[i].toFixed(1)},${scaleY(p.rate).toFixed(1)}`)
    .join(' ');

  const breakevenPath = data.breakevens
    .map((b, i) => `${i === 0 ? 'M' : 'L'} ${tenorPositions[i].toFixed(1)},${scaleY(b.breakeven).toFixed(1)}`)
    .join(' ');

  // Shaded area between nominal and real (the breakeven gap)
  const shadedArea = useMemo(() => {
    const topPoints = data.nominalCurve
      .map((p, i) => `${tenorPositions[i].toFixed(1)},${scaleY(p.rate).toFixed(1)}`)
      .join(' ');
    const bottomPoints = [...data.realYieldCurve]
      .reverse()
      .map((p, i) => {
        const revIdx = data.realYieldCurve.length - 1 - i;
        return `${tenorPositions[revIdx].toFixed(1)},${scaleY(p.rate).toFixed(1)}`;
      })
      .join(' ');
    return `M ${topPoints} L ${bottomPoints} Z`;
  }, [data.nominalCurve, data.realYieldCurve, tenorPositions]);

  // Y-axis ticks
  const yTicks: number[] = [];
  const step = rateRange > 3 ? 0.5 : rateRange > 1.5 ? 0.25 : 0.1;
  for (let r = Math.ceil(minRate / step) * step; r <= maxRate; r += step) {
    yTicks.push(Math.round(r * 1000) / 1000);
  }

  // Fed 2% target line position
  const targetY = scaleY(FED_TARGET);

  return (
    <div className="p-3">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'ibCurveTitle', 'Nominal vs Real Yield Curve & Breakeven')}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 260 }}>
        {/* Grid lines */}
        {yTicks.map((r) => (
          <g key={r}>
            <line
              x1={PAD_L}
              y1={scaleY(r)}
              x2={W - PAD_R}
              y2={scaleY(r)}
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="2,3"
            />
            <text
              x={PAD_L - 4}
              y={scaleY(r) + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.25)"
              fontSize={7}
              fontFamily="monospace"
            >
              {r.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis: tenor labels + grid */}
        {tenors.map((tenor, i) => (
          <g key={tenor}>
            <line
              x1={tenorPositions[i]}
              y1={PAD_T}
              x2={tenorPositions[i]}
              y2={H - PAD_B}
              stroke="rgba(255,255,255,0.03)"
              strokeDasharray="2,3"
            />
            <text
              x={tenorPositions[i]}
              y={H - PAD_B + 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.3)"
              fontSize={7}
              fontFamily="monospace"
            >
              {tenor}
            </text>
          </g>
        ))}

        {/* Fed 2% target line */}
        {targetY >= PAD_T && targetY <= H - PAD_B && (
          <g>
            <line
              x1={PAD_L}
              y1={targetY}
              x2={W - PAD_R}
              y2={targetY}
              stroke="#ef4444"
              strokeWidth={0.8}
              strokeDasharray="4,3"
              opacity={0.5}
            />
            <text
              x={W - PAD_R + 2}
              y={targetY + 3}
              fill="#ef4444"
              fontSize={6}
              fontFamily="monospace"
              opacity={0.6}
            >
              2% Target
            </text>
          </g>
        )}

        {/* Shaded breakeven area between nominal and real */}
        <path d={shadedArea} fill="rgba(239,68,68,0.08)" />

        {/* Real yield curve */}
        <path d={realPath} fill="none" stroke="#3b82f6" strokeWidth={1.5} />

        {/* Breakeven curve */}
        <path d={breakevenPath} fill="none" stroke="#ef4444" strokeWidth={1.2} strokeDasharray="3,2" />

        {/* Nominal curve */}
        <path d={nominalPath} fill="none" stroke="#10b981" strokeWidth={1.5} />

        {/* Data points on nominal curve */}
        {data.nominalCurve.map((p, i) => (
          <g key={`nom-${p.tenor}`}>
            <circle
              cx={tenorPositions[i]}
              cy={scaleY(p.rate)}
              r={2.5}
              fill="#10b981"
              stroke="black"
              strokeWidth={0.5}
            />
            <text
              x={tenorPositions[i]}
              y={scaleY(p.rate) - 6}
              textAnchor="middle"
              fill="rgba(16,185,129,0.7)"
              fontSize={6}
              fontFamily="monospace"
            >
              {p.rate.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Data points on real yield curve */}
        {data.realYieldCurve.map((p, i) => (
          <g key={`real-${p.tenor}`}>
            <circle
              cx={tenorPositions[i]}
              cy={scaleY(p.rate)}
              r={2.5}
              fill="#3b82f6"
              stroke="black"
              strokeWidth={0.5}
            />
            <text
              x={tenorPositions[i]}
              y={scaleY(p.rate) + 10}
              textAnchor="middle"
              fill="rgba(59,130,246,0.7)"
              fontSize={6}
              fontFamily="monospace"
            >
              {p.rate.toFixed(2)}
            </text>
          </g>
        ))}

        {/* Breakeven labels (in the shaded area) */}
        {data.breakevens.map((b, i) => {
          const nomY = scaleY(data.nominalCurve[i].rate);
          const realY = scaleY(data.realYieldCurve[i].rate);
          const midY = (nomY + realY) / 2;
          // Only show label for select tenors to avoid clutter
          if (i % 2 !== 0 && i !== data.breakevens.length - 1) return null;
          return (
            <text
              key={`be-${b.tenor}`}
              x={tenorPositions[i] + 8}
              y={midY + 3}
              fill="rgba(239,68,68,0.6)"
              fontSize={6}
              fontFamily="monospace"
            >
              {b.breakeven.toFixed(2)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 px-1">
        <LegendItem color="#10b981" label={tr(t, 'ibNominalCurve', 'Nominal')} dashed={false} />
        <LegendItem color="#3b82f6" label={tr(t, 'ibRealCurve', 'Real (TIPS)')} dashed={false} />
        <LegendItem color="#ef4444" label={tr(t, 'ibBreakevenCurve', 'Breakeven')} dashed />
        <div className="flex items-center gap-1">
          <div className="w-3 h-[6px] bg-red-500/10 border border-red-500/20" />
          <span className="text-[7px] font-mono text-neutral-500">{tr(t, 'ibBEArea', 'BE Spread')}</span>
        </div>
      </div>

      {/* Summary metrics */}
      <div className="mt-3 pt-2 border-t border-border/20">
        <CurveSummary data={data} t={t} />
      </div>

      {/* Timestamp */}
      <div className="mt-2 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'ibUpdated', 'Updated')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

function CurveSummary({ data, t }: { data: InflationBreakevenData; t: ReturnType<typeof useT> }) {
  const be5 = data.breakevens.find((b) => b.tenor === '5Y');
  const be10 = data.breakevens.find((b) => b.tenor === '10Y');
  const be30 = data.breakevens.find((b) => b.tenor === '30Y');

  const metrics = [
    { label: '5Y BE', value: be5?.breakeven, change: be5?.change1d },
    { label: '10Y BE', value: be10?.breakeven, change: be10?.change1d },
    { label: '30Y BE', value: be30?.breakeven, change: be30?.change1d },
    { label: '5Y5Y Fwd', value: data.fiveYearFiveYear, change: null },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {metrics.map((m) => (
        <div key={m.label}>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {m.label}
          </div>
          <div className={`text-[9px] font-mono font-bold ${m.value !== undefined ? breakevenColor(m.value) : 'text-neutral-500'}`}>
            {m.value !== undefined ? `${fmtRate(m.value)}%` : '--'}
          </div>
          {m.change !== null && m.change !== undefined && (
            <div className={`text-[7px] font-mono ${inflationColor(m.change)}`}>
              {fmtBps(m.change)}bp
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Sparklines ──

function MiniSparkline({ data }: { data: number[] }) {
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

  // Inflation rising = red, falling = green
  const rising = data[data.length - 1] > data[0];
  const color = rising ? '#ef4444' : '#4ade80';

  return (
    <svg viewBox={`0 0 ${path.W} ${path.H}`} width={48} height={14}>
      <path d={path.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

function IndicatorSparkline({ data, target }: { data: number[]; target: number | null }) {
  const pathData = useMemo(() => {
    if (data.length < 2) return null;
    const W = 48;
    const H = 14;
    const PAD = 1;

    const allValues = target !== null ? [...data, target] : data;
    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const rangeV = maxV - minV || 0.001;

    const scaleX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const scaleY = (v: number) => PAD + ((maxV - v) / rangeV) * (H - PAD * 2);

    const linePath = data
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const targetY = target !== null ? scaleY(target) : null;

    return { linePath, targetY, W, H };
  }, [data, target]);

  if (!pathData) return null;

  const rising = data[data.length - 1] > data[0];
  const color = rising ? '#ef4444' : '#4ade80';

  return (
    <svg viewBox={`0 0 ${pathData.W} ${pathData.H}`} width={48} height={14}>
      {/* Target line */}
      {pathData.targetY !== null && (
        <line
          x1={0}
          y1={pathData.targetY}
          x2={pathData.W}
          y2={pathData.targetY}
          stroke="#ef4444"
          strokeWidth={0.5}
          strokeDasharray="2,2"
          opacity={0.4}
        />
      )}
      <path d={pathData.linePath} fill="none" stroke={color} strokeWidth={1} />
    </svg>
  );
}

// ── Legend Item ──

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className="w-3 h-[2px]"
        style={{
          backgroundColor: dashed ? 'transparent' : color,
          borderBottom: dashed ? `1px dashed ${color}` : 'none',
        }}
      />
      <span className="text-[7px] font-mono text-neutral-500">{label}</span>
    </div>
  );
}
