import { useState } from 'react';
import {
  useMarketSentimentIndex,
  type MarketSentimentIndexData,
  type SentimentSignal,
  type PositioningEntry,
} from '../../api/hooks/use-market-sentiment-index';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Tabs ──

type Tab = 'overview' | 'components' | 'positioning' | 'history';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'components', label: 'COMPONENTS' },
  { key: 'positioning', label: 'POSITIONING' },
  { key: 'history', label: 'HISTORY' },
];

// ── Color Helpers ──

function getCompositeColor(value: number): { text: string; fill: string; bg: string } {
  if (value <= 20) return { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.06)' };
  if (value <= 40) return { text: 'text-orange-400', fill: '#fb923c', bg: 'rgba(251,146,60,0.06)' };
  if (value <= 60) return { text: 'text-yellow-400', fill: '#facc15', bg: 'rgba(250,204,21,0.06)' };
  if (value <= 80) return { text: 'text-green-400', fill: '#4ade80', bg: 'rgba(74,222,128,0.06)' };
  return { text: 'text-emerald-400', fill: '#34d399', bg: 'rgba(52,211,153,0.06)' };
}

function getSignalColor(signal: SentimentSignal): { text: string; bg: string; border: string } {
  switch (signal) {
    case 'bullish': return { text: 'text-green-400', bg: 'bg-green-500/15', border: 'border-green-500/30' };
    case 'bearish': return { text: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30' };
    case 'neutral': return { text: 'text-neutral-400', bg: 'bg-neutral-500/15', border: 'border-neutral-500/30' };
  }
}

function changeColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function percentileColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 60) return 'bg-green-500/60';
  if (pct >= 40) return 'bg-amber-500/60';
  if (pct >= 20) return 'bg-red-500/60';
  return 'bg-red-500';
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

// ── Main Panel ──

export function MarketSentimentIndexPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarketSentimentIndex();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-orange-400" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 8L12 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="8" r="1.2" fill="currentColor" />
            <path d="M4 11L6.5 9.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
            <path d="M12 11L9.5 9.5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-orange-400">
            {tr(t, 'msiTitle', 'Market Sentiment Index')}
          </span>
          {data && (
            <span
              className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${getCompositeColor(data.composite.value).text}`}
              style={{ background: getCompositeColor(data.composite.value).bg }}
            >
              {data.composite.label}
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-orange-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'text-orange-400 bg-orange-500/10 border border-orange-500/20'
                : 'text-neutral-600 hover:text-neutral-400 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'msiNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'overview' && (
          <>
            <CompositeGauge data={data} />
            <QuickStats data={data} />
            <ComponentSummary data={data} />
          </>
        )}

        {data && activeTab === 'components' && <ComponentsTable data={data} />}

        {data && activeTab === 'positioning' && <PositioningTable data={data} />}

        {data && activeTab === 'history' && <HistoricalContext data={data} />}
      </div>
    </div>
  );
}

// ── 1. Composite Gauge (Semi-circular) ──

function CompositeGauge({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();
  const { value, label, dailyChange } = data.composite;
  const color = getCompositeColor(value);

  const CX = 120;
  const CY = 100;
  const R = 80;
  const STROKE_W = 12;
  const startAngle = Math.PI;
  const totalAngle = Math.PI;

  const needleAngle = startAngle - (value / 100) * totalAngle;
  const needleX = CX + (R - 6) * Math.cos(needleAngle);
  const needleY = CY - (R - 6) * Math.sin(needleAngle);

  const zones = [
    { from: 0, to: 20, color: '#ef4444' },
    { from: 20, to: 40, color: '#f97316' },
    { from: 40, to: 60, color: '#eab308' },
    { from: 60, to: 80, color: '#22c55e' },
    { from: 80, to: 100, color: '#10b981' },
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY - R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY - R * Math.sin(a2);
    const largeArc = (toPct - fromPct) > 50 ? 1 : 0;
    return `M ${x1},${y1} A ${R},${R} 0 ${largeArc} 0 ${x2},${y2}`;
  }

  return (
    <div className="px-3 pt-3 pb-1 border-b border-border/20 flex flex-col items-center" style={{ background: color.bg }}>
      <svg viewBox="0 0 240 125" className="w-full" style={{ maxWidth: 320, maxHeight: 165 }}>
        {/* Background track */}
        <path d={arcPath(0, 100)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={STROKE_W} strokeLinecap="round" />

        {/* Zone arcs */}
        {zones.map((z) => (
          <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={STROKE_W} strokeLinecap="butt" opacity={0.5} />
        ))}

        {/* Filled progress */}
        <path d={arcPath(0, value)} fill="none" stroke={color.fill} strokeWidth={STROKE_W + 2} strokeLinecap="round" opacity={0.3} />

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke={color.fill} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill={color.fill} />
        <circle cx={CX} cy={CY} r={2.5} fill="#000" />

        {/* Score text */}
        <text x={CX} y={CY + 5} textAnchor="middle" fill="white" fontSize={32} fontFamily="monospace" fontWeight="900" dominantBaseline="hanging">
          {Math.round(value)}
        </text>

        {/* End labels */}
        <text x={CX - R - 6} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">0</text>
        <text x={CX + R + 6} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize={7} fontFamily="monospace">100</text>

        {/* Fear / Greed labels */}
        <text x={CX - R + 10} y={CY + 22} textAnchor="middle" fill="#f87171" fontSize={5.5} fontFamily="monospace" opacity={0.5}>FEAR</text>
        <text x={CX + R - 10} y={CY + 22} textAnchor="middle" fill="#34d399" fontSize={5.5} fontFamily="monospace" opacity={0.5}>GREED</text>
      </svg>

      {/* Label and delta */}
      <div className="flex flex-col items-center gap-0.5 -mt-1 mb-1">
        <span className={`text-[11px] font-black font-mono uppercase tracking-wider ${color.text}`}>
          {label}
        </span>
        <span className={`text-[8px] font-mono font-bold ${changeColor(dailyChange)}`}>
          {fmtChange(dailyChange)} {tr(t, 'msiVsPrev', 'vs yesterday')}
        </span>
      </div>
    </div>
  );
}

// ── 2. Quick Stats Row ──

function QuickStats({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();
  const { dailyChange, weeklyChange, percentile } = data.composite;

  return (
    <div className="px-3 py-2 border-b border-border/20 grid grid-cols-3 gap-2">
      {/* Daily Change */}
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 font-mono mb-0.5">
          {tr(t, 'msiDaily', '1D Chg')}
        </span>
        <span className={`text-[12px] font-black font-mono tabular-nums ${changeColor(dailyChange)}`}>
          {fmtChange(dailyChange)}
        </span>
      </div>

      {/* Weekly Change */}
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 font-mono mb-0.5">
          {tr(t, 'msiWeekly', '1W Chg')}
        </span>
        <span className={`text-[12px] font-black font-mono tabular-nums ${changeColor(weeklyChange)}`}>
          {fmtChange(weeklyChange)}
        </span>
      </div>

      {/* Percentile */}
      <div className="flex flex-col items-center">
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-500 font-mono mb-0.5">
          {tr(t, 'msiPercentile', 'Percentile')}
        </span>
        <div className="flex items-center gap-1">
          <span className="text-[12px] font-black font-mono tabular-nums text-orange-400">
            {percentile}
          </span>
          <span className="text-[7px] font-mono text-neutral-600">/ 100</span>
        </div>
      </div>
    </div>
  );
}

// ── 3. Component Summary (mini bars in overview) ──

function ComponentSummary({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
        {tr(t, 'msiComponents', 'Sentiment Components')}
      </div>
      <div className="flex flex-col gap-0.5">
        {data.components.map((comp) => {
          const signal = getSignalColor(comp.signal);
          const barWidth = Math.max(0, Math.min(100, comp.value));
          const contribColor = comp.contribution > 0 ? 'text-emerald-400' : comp.contribution < 0 ? 'text-red-400' : 'text-neutral-600';

          return (
            <div key={comp.name} className="flex items-center gap-1.5 px-1 py-[3px] hover:bg-orange-400/[0.02] transition-colors">
              {/* Name */}
              <span className="text-[7.5px] font-mono font-bold text-neutral-300 w-[90px] truncate shrink-0">
                {comp.name}
              </span>

              {/* Value bar */}
              <div className="flex-1 h-[5px] bg-white/[0.04] relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${barWidth}%`, background: getCompositeColor(comp.value).fill, opacity: 0.6 }}
                />
              </div>

              {/* Value */}
              <span className={`text-[8px] font-mono font-bold tabular-nums w-[24px] text-right ${getCompositeColor(comp.value).text}`}>
                {Math.round(comp.value)}
              </span>

              {/* Signal badge */}
              <span className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] border ${signal.bg} ${signal.border} ${signal.text} w-[36px] text-center`}>
                {comp.signal === 'bullish' ? 'BULL' : comp.signal === 'bearish' ? 'BEAR' : 'NEUT'}
              </span>

              {/* Contribution */}
              <span className={`text-[7px] font-mono font-bold tabular-nums w-[28px] text-right ${contribColor}`}>
                {comp.contribution > 0 ? '+' : ''}{comp.contribution.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. Full Components Table ──

function ComponentsTable({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
        {tr(t, 'msiComponentDetails', 'Component Details')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_40px_44px_48px] gap-0 px-1 mb-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Indicator</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider text-right">Contrib</span>
      </div>

      {/* Rows */}
      {data.components.map((comp) => {
        const signal = getSignalColor(comp.signal);
        const contribColor = comp.contribution > 0 ? 'text-emerald-400' : comp.contribution < 0 ? 'text-red-400' : 'text-neutral-600';

        return (
          <div key={comp.name} className="border-b border-border/10">
            <div className="grid grid-cols-[1fr_40px_44px_48px] gap-0 px-1 py-[4px] hover:bg-orange-400/[0.02] transition-colors items-center">
              {/* Name */}
              <div className="flex flex-col min-w-0">
                <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">{comp.name}</span>
                <span className="text-[6.5px] font-mono text-neutral-600 leading-tight truncate">{comp.description}</span>
              </div>

              {/* Value */}
              <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${getCompositeColor(comp.value).text}`}>
                {Math.round(comp.value)}
              </span>

              {/* Signal badge */}
              <div className="flex justify-center">
                <span className={`text-[6px] font-mono font-black uppercase px-1.5 py-[1px] border ${signal.bg} ${signal.border} ${signal.text}`}>
                  {comp.signal === 'bullish' ? 'BULL' : comp.signal === 'bearish' ? 'BEAR' : 'NEUT'}
                </span>
              </div>

              {/* Contribution */}
              <span className={`text-[8px] font-mono font-bold tabular-nums text-right ${contribColor}`}>
                {comp.contribution > 0 ? '+' : ''}{comp.contribution.toFixed(1)}
              </span>
            </div>

            {/* Mini bar */}
            <div className="px-1 pb-1">
              <div className="h-[3px] bg-white/[0.03] relative">
                <div
                  className="absolute inset-y-0 left-0"
                  style={{ width: `${Math.max(0, Math.min(100, comp.value))}%`, background: getCompositeColor(comp.value).fill, opacity: 0.5 }}
                />
                {/* 50% marker */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/10" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Positioning Table (CFTC COT) ──

function PositioningTable({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
        {tr(t, 'msiPositioning', 'CFTC COT Positioning')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[64px_72px_56px_56px_48px] gap-0 px-1 py-0.5 border-b border-border/10 bg-[#030303] sticky top-0 z-10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Symbol</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Net Pos</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Change</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Pctl</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Flag</span>
      </div>

      {/* Rows */}
      {data.positioning.map((pos) => (
        <PositioningRow key={pos.symbol} entry={pos} />
      ))}

      {data.positioning.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'msiNoPositioning', 'No positioning data')}
        </div>
      )}
    </div>
  );
}

function PositioningRow({ entry }: { entry: PositioningEntry }) {
  const netColor = entry.netPosition > 0 ? 'text-green-400' : entry.netPosition < 0 ? 'text-red-400' : 'text-neutral-500';

  return (
    <div className="grid grid-cols-[64px_72px_56px_56px_48px] gap-0 px-1 py-[3px] border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors items-center">
      {/* Symbol + Name */}
      <div className="flex flex-col min-w-0">
        <span className="text-[9px] font-mono font-bold text-white leading-tight">{entry.symbol}</span>
        <span className="text-[7px] font-mono text-neutral-600 leading-tight truncate">{entry.name}</span>
      </div>

      {/* Net Position */}
      <span className={`text-[9px] font-mono font-bold text-right tabular-nums ${netColor}`}>
        {fmtCompact(entry.netPosition)}
      </span>

      {/* Change */}
      <span className={`text-[8px] font-mono text-right tabular-nums ${changeColor(entry.change)}`}>
        {entry.change > 0 ? '+' : ''}{fmtCompact(entry.change)}
      </span>

      {/* Percentile bar */}
      <div className="flex items-center justify-center px-0.5">
        <div className="w-full h-3 bg-white/[0.04] relative">
          <div
            className={`h-full ${percentileColor(entry.percentile)} transition-all`}
            style={{ width: `${entry.percentile}%` }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[7px] font-mono font-bold text-white/80">
            {entry.percentile}
          </span>
        </div>
      </div>

      {/* Extreme flag */}
      <div className="flex items-center justify-center">
        {entry.extreme && <ExtremeBadge extreme={entry.extreme} />}
      </div>
    </div>
  );
}

function ExtremeBadge({ extreme }: { extreme: 'long' | 'short' }) {
  const isLong = extreme === 'long';
  const bgClass = isLong ? 'bg-green-500/15 border-green-500/30' : 'bg-red-500/15 border-red-500/30';
  const textClass = isLong ? 'text-green-400' : 'text-red-400';
  const label = isLong ? 'LONG' : 'SHORT';

  return (
    <span className={`px-1 py-0.5 text-[6px] font-mono font-black uppercase tracking-wider border ${bgClass} ${textClass}`}>
      {label}
    </span>
  );
}

// ── 6. Historical Context ──

function HistoricalContext({ data }: { data: MarketSentimentIndexData }) {
  const t = useT();
  const currentColor = getCompositeColor(data.composite.value);

  return (
    <div>
      {/* Current vs Past */}
      <div className="px-2 py-2 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
          {tr(t, 'msiHistComparison', 'Current vs Historical')}
        </div>

        {/* Current value highlight */}
        <div className="px-1 py-2 mb-2 flex items-center justify-between" style={{ background: currentColor.bg }}>
          <span className="text-[8px] font-mono font-bold text-neutral-300 uppercase tracking-wider">Current</span>
          <span className={`text-[14px] font-black font-mono tabular-nums ${currentColor.text}`}>
            {Math.round(data.composite.value)}
          </span>
        </div>

        {/* Historical periods */}
        <div className="flex flex-col gap-0.5">
          {data.historicalComparisons.map((comp) => {
            const compColor = getCompositeColor(comp.score);
            const delta = data.composite.value - comp.score;

            return (
              <div key={comp.period} className="grid grid-cols-[1fr_36px_48px_44px] gap-0 px-1 py-[3px] hover:bg-orange-400/[0.02] transition-colors items-center">
                {/* Period label */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-mono font-bold text-neutral-300">{comp.period}</span>
                  <span className="text-[6.5px] font-mono text-neutral-600 truncate">{comp.label}</span>
                </div>

                {/* Score */}
                <span className={`text-[9px] font-mono font-bold tabular-nums text-right ${compColor.text}`}>
                  {Math.round(comp.score)}
                </span>

                {/* Mini comparison bar */}
                <div className="flex items-center px-1">
                  <div className="w-full h-[5px] bg-white/[0.04] relative">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{ width: `${Math.max(0, Math.min(100, comp.score))}%`, background: compColor.fill, opacity: 0.5 }}
                    />
                  </div>
                </div>

                {/* Delta */}
                <span className={`text-[7.5px] font-mono font-bold tabular-nums text-right ${changeColor(delta)}`}>
                  {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Notable Extremes */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1 font-mono">
          {tr(t, 'msiExtremes', 'Notable Sentiment Extremes')}
        </div>

        {data.notableExtremes.length === 0 && (
          <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
            {tr(t, 'msiNoExtremes', 'No notable extremes')}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {data.notableExtremes.map((ext, i) => {
            const extColor = getCompositeColor(ext.score);
            return (
              <div key={i} className="px-1 py-1.5 border border-border/10 hover:border-border/20 transition-colors" style={{ background: 'rgba(255,255,255,0.01)' }}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-mono text-neutral-500">{ext.date}</span>
                    <span className={`text-[9px] font-mono font-black tabular-nums ${extColor.text}`}>
                      {Math.round(ext.score)}
                    </span>
                    <span className={`text-[6px] font-mono font-black uppercase px-1 py-[0.5px] ${extColor.text}`} style={{ background: extColor.bg }}>
                      {ext.label}
                    </span>
                  </div>
                </div>
                <p className="text-[7px] font-mono text-neutral-500 leading-relaxed">
                  {ext.outcome}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
