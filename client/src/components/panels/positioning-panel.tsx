import { useState } from 'react';
import {
  usePositioning,
  type PositioningResponse,
  type PositioningIndicator,
  type FlowData,
  type SignalLevel,
  type IndicatorCategory,
} from '../../api/hooks/use-positioning';
import { useT } from '../../i18n';
import { Compass, RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  return (t as (k: string) => string)(key) || fallback;
};

// ── Signal Colors ──

function getSignalColor(signal: SignalLevel): { text: string; fill: string; bg: string } {
  switch (signal) {
    case 'EXTREME_BULLISH': return { text: 'text-emerald-300', fill: '#6ee7b7', bg: 'rgba(110,231,183,0.12)' };
    case 'BULLISH': return { text: 'text-green-400', fill: '#4ade80', bg: 'rgba(74,222,128,0.08)' };
    case 'NEUTRAL': return { text: 'text-neutral-400', fill: '#a3a3a3', bg: 'rgba(163,163,163,0.06)' };
    case 'BEARISH': return { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.08)' };
    case 'EXTREME_BEARISH': return { text: 'text-red-300', fill: '#fca5a5', bg: 'rgba(252,165,165,0.12)' };
  }
}

function getSentimentColor(score: number): { text: string; fill: string } {
  if (score <= -60) return { text: 'text-red-300', fill: '#fca5a5' };
  if (score <= -20) return { text: 'text-red-400', fill: '#f87171' };
  if (score <= 20) return { text: 'text-neutral-400', fill: '#a3a3a3' };
  if (score <= 60) return { text: 'text-green-400', fill: '#4ade80' };
  return { text: 'text-emerald-300', fill: '#6ee7b7' };
}

function getPercentileColor(pct: number): string {
  if (pct >= 85 || pct <= 15) return '#4ade80'; // extreme = contrarian potential (green)
  if (pct >= 70 || pct <= 30) return '#facc15';
  return '#525252';
}

// ── Formatting ──

function fmtVal(value: number, unit: string): string {
  if (unit === '$B') return `$${value.toFixed(1)}B`;
  if (unit === '%') return `${value.toFixed(1)}%`;
  if (unit === 'ratio') return value.toFixed(4);
  if (unit === 'index') return String(Math.round(value));
  return value.toFixed(2);
}

function fmtChange(change: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(4)}`;
}

function fmtFlow(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

// ── Types ──

type TabKey = 'indicators' | 'flows' | 'dashboard';
type CategoryFilter = 'all' | IndicatorCategory;

// ── Main Panel ──

export function PositioningPanel() {
  const t = useT();
  const { data, isLoading, refetch } = usePositioning();
  const [activeTab, setActiveTab] = useState<TabKey>('indicators');

  const sentimentColor = data ? getSentimentColor(data.overallSentiment.score) : null;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'indicators', label: tr(t, 'posIndicators', 'INDICATORS') },
    { key: 'flows', label: tr(t, 'posFlows', 'FLOWS') },
    { key: 'dashboard', label: tr(t, 'posDashboard', 'DASHBOARD') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-sky-400">
            {tr(t, 'posTitle', 'Positioning & Flows')}
          </span>
          {data && sentimentColor && (
            <span
              className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${sentimentColor.text}`}
              style={{ background: `${sentimentColor.fill}11` }}
            >
              {data.overallSentiment.label}
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-sky-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1 bg-[#050505] border-b border-border/30 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
                : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {tr(t, 'posNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'indicators' && <IndicatorsTab data={data} />}
        {data && activeTab === 'flows' && <FlowsTab data={data} />}
        {data && activeTab === 'dashboard' && <DashboardTab data={data} />}
      </div>
    </div>
  );
}

// ── INDICATORS TAB ──

function IndicatorsTab({ data }: { data: PositioningResponse }) {
  const t = useT();
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: 'ALL' },
    { key: 'options', label: 'OPTIONS' },
    { key: 'sentiment', label: 'SENTIMENT' },
    { key: 'leverage', label: 'LEVERAGE' },
    { key: 'flows', label: 'FLOWS' },
    { key: 'breadth', label: 'BREADTH' },
  ];

  const filtered = filter === 'all'
    ? data.indicators
    : data.indicators.filter((ind) => ind.category === filter);

  return (
    <div>
      {/* Category filter */}
      <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-border/20">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-wider transition-colors ${
              filter === cat.key
                ? 'text-sky-400 bg-sky-400/10'
                : 'text-neutral/30 hover:text-neutral/50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_56px_70px_72px_1fr_46px] gap-px px-3 py-1 border-b border-border/20 text-[7px] font-mono uppercase tracking-wider text-neutral/30">
        <span>{tr(t, 'posName', 'Name')}</span>
        <span className="text-right">{tr(t, 'posValue', 'Value')}</span>
        <span className="text-right">{tr(t, 'posChange', 'Chg')}</span>
        <span>{tr(t, 'posPctile', 'Percentile')}</span>
        <span>{tr(t, 'posSignal', 'Signal')}</span>
        <span>{tr(t, 'posInterp', 'Interpretation')}</span>
        <span className="text-right">{tr(t, 'posSpark', 'Trend')}</span>
      </div>

      {/* Rows */}
      {filtered.map((ind) => (
        <IndicatorRow key={ind.name} indicator={ind} />
      ))}
    </div>
  );
}

function IndicatorRow({ indicator }: { indicator: PositioningIndicator }) {
  const color = getSignalColor(indicator.signal);
  const pctColor = getPercentileColor(indicator.percentile);
  const changeColor = indicator.change > 0 ? 'text-emerald-400' : indicator.change < 0 ? 'text-red-400' : 'text-neutral/40';

  return (
    <div className="grid grid-cols-[1fr_60px_56px_70px_72px_1fr_46px] gap-px px-3 py-1 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors items-center">
      {/* Name */}
      <div className="flex flex-col">
        <span className="text-[8px] font-mono font-bold text-neutral-300 truncate">{indicator.name}</span>
        <span className="text-[6px] font-mono text-neutral/25 uppercase">{indicator.category}</span>
      </div>

      {/* Value */}
      <span className="text-[9px] font-mono font-bold text-white text-right tabular-nums">
        {fmtVal(indicator.currentValue, indicator.unit)}
      </span>

      {/* Change */}
      <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor}`}>
        {fmtChange(indicator.change)}
      </span>

      {/* Percentile bar */}
      <div className="flex items-center gap-1">
        <div className="flex-1 h-[5px] bg-white/[0.04] relative">
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: `${indicator.percentile}%`, background: pctColor, opacity: 0.7 }}
          />
        </div>
        <span className="text-[7px] font-mono tabular-nums text-neutral/40 w-[18px] text-right">
          {indicator.percentile}
        </span>
      </div>

      {/* Signal badge */}
      <span
        className={`text-[6.5px] font-mono font-black uppercase px-1 py-[1px] truncate ${color.text}`}
        style={{ background: color.bg }}
      >
        {indicator.signal.replace('_', ' ')}
      </span>

      {/* Interpretation */}
      <span className="text-[7px] font-mono text-neutral/40 truncate">
        {indicator.interpretation}
      </span>

      {/* Sparkline */}
      <div className="flex justify-end">
        {indicator.history.length > 1 && (
          <MiniSparkline data={indicator.history} color={color.fill} />
        )}
      </div>
    </div>
  );
}

// ── FLOWS TAB ──

function FlowsTab({ data }: { data: PositioningResponse }) {
  const t = useT();

  return (
    <div>
      {/* Flow table */}
      <div className="px-3 py-1.5 border-b border-border/20">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral/40 mb-1 font-mono">
          {tr(t, 'posFlowTable', 'Fund Flow Summary')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_70px_70px_70px_60px] gap-px py-1 border-b border-border/20 text-[7px] font-mono uppercase tracking-wider text-neutral/30">
          <span>{tr(t, 'posCategory', 'Category')}</span>
          <span className="text-right">{tr(t, 'posWeekly', 'Weekly')}</span>
          <span className="text-right">{tr(t, 'posMonthly', 'Monthly')}</span>
          <span className="text-right">{tr(t, 'posYtd', 'YTD')}</span>
          <span className="text-right">{tr(t, 'posTrend', 'Trend')}</span>
        </div>

        {/* Rows */}
        {data.flows.map((flow) => (
          <FlowRow key={flow.category} flow={flow} />
        ))}
      </div>

      {/* Weekly flow bar chart */}
      <div className="px-3 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral/40 mb-2 font-mono">
          {tr(t, 'posWeeklyChart', 'Weekly Flows ($B)')}
        </div>
        <FlowBarChart flows={data.flows} />
      </div>
    </div>
  );
}

function FlowRow({ flow }: { flow: FlowData }) {
  const trendColor = flow.trend === 'inflow' ? 'text-emerald-400' :
                     flow.trend === 'outflow' ? 'text-red-400' : 'text-neutral/40';
  const trendLabel = flow.trend === 'inflow' ? 'INFLOW' :
                     flow.trend === 'outflow' ? 'OUTFLOW' : 'NEUTRAL';

  return (
    <div className="grid grid-cols-[1fr_70px_70px_70px_60px] gap-px py-1.5 border-b border-border/10 hover:bg-sky-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-neutral-300">{flow.category}</span>
      <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
        flow.weeklyFlow > 0 ? 'text-emerald-400' : flow.weeklyFlow < 0 ? 'text-red-400' : 'text-neutral/40'
      }`}>
        {fmtFlow(flow.weeklyFlow)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
        flow.monthlyFlow > 0 ? 'text-emerald-400' : flow.monthlyFlow < 0 ? 'text-red-400' : 'text-neutral/40'
      }`}>
        {fmtFlow(flow.monthlyFlow)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${
        flow.ytdFlow > 0 ? 'text-emerald-400' : flow.ytdFlow < 0 ? 'text-red-400' : 'text-neutral/40'
      }`}>
        {fmtFlow(flow.ytdFlow)}
      </span>
      <span className={`text-[7px] font-mono font-black uppercase text-right ${trendColor}`}>
        {trendLabel}
      </span>
    </div>
  );
}

function FlowBarChart({ flows }: { flows: FlowData[] }) {
  const W = 300;
  const H = 100;
  const PAD_X = 50;
  const PAD_Y = 10;
  const PAD_BOTTOM = 18;

  const values = flows.map((f) => f.weeklyFlow);
  const maxAbs = Math.max(Math.abs(Math.min(...values)), Math.abs(Math.max(...values)), 0.1);

  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;
  const barW = Math.min(40, chartW / flows.length - 4);
  const zeroY = PAD_Y + chartH / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* Zero line */}
      <line x1={PAD_X} y1={zeroY} x2={W - PAD_X} y2={zeroY} stroke="rgba(255,255,255,0.1)" strokeWidth={0.5} />

      {/* Bars */}
      {flows.map((flow, i) => {
        const x = PAD_X + (i / flows.length) * chartW + (chartW / flows.length - barW) / 2;
        const barH = (Math.abs(flow.weeklyFlow) / maxAbs) * (chartH / 2);
        const y = flow.weeklyFlow >= 0 ? zeroY - barH : zeroY;
        const fill = flow.weeklyFlow >= 0 ? '#4ade80' : '#f87171';

        return (
          <g key={flow.category}>
            <rect x={x} y={y} width={barW} height={Math.max(barH, 1)} fill={fill} opacity={0.7} />
            {/* Value label */}
            <text
              x={x + barW / 2}
              y={flow.weeklyFlow >= 0 ? y - 3 : y + barH + 8}
              textAnchor="middle"
              fill={fill}
              fontSize={6}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtFlow(flow.weeklyFlow)}
            </text>
            {/* Category label */}
            <text
              x={x + barW / 2}
              y={H - 3}
              textAnchor="middle"
              fill="rgba(255,255,255,0.25)"
              fontSize={5.5}
              fontFamily="monospace"
            >
              {flow.category.length > 8 ? flow.category.slice(0, 7) + '.' : flow.category}
            </text>
          </g>
        );
      })}

      {/* Y-axis labels */}
      <text x={PAD_X - 4} y={PAD_Y + 4} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        +{maxAbs.toFixed(1)}
      </text>
      <text x={PAD_X - 4} y={zeroY + 3} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        0
      </text>
      <text x={PAD_X - 4} y={H - PAD_BOTTOM} textAnchor="end" fill="rgba(255,255,255,0.2)" fontSize={6} fontFamily="monospace">
        -{maxAbs.toFixed(1)}
      </text>
    </svg>
  );
}

// ── DASHBOARD TAB ──

function DashboardTab({ data }: { data: PositioningResponse }) {
  const t = useT();
  const { score, label, bullCount, bearCount, neutralCount } = data.overallSentiment;
  const sentColor = getSentimentColor(score);

  return (
    <div>
      {/* Sentiment gauge */}
      <div className="px-3 pt-3 pb-2 border-b border-border/20 flex flex-col items-center">
        <SentimentGauge score={score} label={label} color={sentColor} />
      </div>

      {/* Bull / Bear / Neutral counts */}
      <div className="grid grid-cols-3 gap-px px-3 py-2 border-b border-border/20">
        <CountBox label={tr(t, 'posBullish', 'Bullish')} count={bullCount} color="text-emerald-400" bg="rgba(74,222,128,0.06)" />
        <CountBox label={tr(t, 'posNeutral', 'Neutral')} count={neutralCount} color="text-neutral-400" bg="rgba(163,163,163,0.04)" />
        <CountBox label={tr(t, 'posBearish', 'Bearish')} count={bearCount} color="text-red-400" bg="rgba(248,113,113,0.06)" />
      </div>

      {/* Mini indicator cards grid */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral/40 mb-1.5 px-1 font-mono">
          {tr(t, 'posAllIndicators', 'All Indicators')}
        </div>
        <div className="grid grid-cols-2 gap-1">
          {data.indicators.map((ind) => (
            <MiniIndicatorCard key={ind.name} indicator={ind} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SentimentGauge({ score, label, color }: { score: number; label: string; color: { text: string; fill: string } }) {
  // Semicircle gauge from -100 to +100
  const CX = 120;
  const CY = 100;
  const R = 80;
  const STROKE_W = 12;
  const startAngle = Math.PI; // left = -100
  const totalAngle = Math.PI;

  // Map score from [-100, +100] to [0, 1]
  const normalized = (score + 100) / 200;
  const needleAngle = startAngle - normalized * totalAngle;
  const needleX = CX + (R - 6) * Math.cos(needleAngle);
  const needleY = CY - (R - 6) * Math.sin(needleAngle);

  const zones = [
    { from: 0, to: 20, color: '#ef4444' },     // Extreme Fear
    { from: 20, to: 40, color: '#f97316' },     // Fear
    { from: 40, to: 60, color: '#a3a3a3' },     // Neutral
    { from: 60, to: 80, color: '#22c55e' },     // Greed
    { from: 80, to: 100, color: '#10b981' },    // Extreme Greed
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
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 125" className="w-full" style={{ maxWidth: 300, maxHeight: 155 }}>
        {/* Background track */}
        <path d={arcPath(0, 100)} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={STROKE_W} strokeLinecap="round" />

        {/* Zone arcs */}
        {zones.map((z) => (
          <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={STROKE_W} strokeLinecap="butt" opacity={0.4} />
        ))}

        {/* Filled progress */}
        <path d={arcPath(0, normalized * 100)} fill="none" stroke={color.fill} strokeWidth={STROKE_W + 2} strokeLinecap="round" opacity={0.25} />

        {/* Needle */}
        <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke={color.fill} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={CX} cy={CY} r={5} fill={color.fill} />
        <circle cx={CX} cy={CY} r={2.5} fill="#000" />

        {/* Score text */}
        <text x={CX} y={CY + 5} textAnchor="middle" fill="white" fontSize={30} fontFamily="monospace" fontWeight="900" dominantBaseline="hanging">
          {score > 0 ? '+' : ''}{score}
        </text>

        {/* End labels */}
        <text x={CX - R - 8} y={CY + 12} textAnchor="middle" fill="#f87171" fontSize={6} fontFamily="monospace" opacity={0.5}>-100</text>
        <text x={CX + R + 8} y={CY + 12} textAnchor="middle" fill="#34d399" fontSize={6} fontFamily="monospace" opacity={0.5}>+100</text>

        {/* Bottom labels */}
        <text x={CX - R + 12} y={CY + 22} textAnchor="middle" fill="#f87171" fontSize={5} fontFamily="monospace" opacity={0.4}>FEAR</text>
        <text x={CX + R - 12} y={CY + 22} textAnchor="middle" fill="#34d399" fontSize={5} fontFamily="monospace" opacity={0.4}>GREED</text>
      </svg>

      <span className={`text-[11px] font-black font-mono uppercase tracking-wider -mt-1 ${color.text}`}>
        {label.replace('_', ' ')}
      </span>
    </div>
  );
}

function CountBox({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <div className="flex flex-col items-center py-2" style={{ background: bg }}>
      <span className="text-[7px] font-mono uppercase tracking-wider text-neutral/40">{label}</span>
      <span className={`text-[18px] font-black font-mono ${color}`}>{count}</span>
    </div>
  );
}

function MiniIndicatorCard({ indicator }: { indicator: PositioningIndicator }) {
  const color = getSignalColor(indicator.signal);

  return (
    <div
      className="px-1.5 py-1.5 border border-border/10 hover:border-border/20 transition-colors"
      style={{ background: 'rgba(255,255,255,0.01)' }}
    >
      {/* Name + signal */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono font-bold text-neutral-300 truncate">{indicator.name}</span>
        <span
          className={`text-[5.5px] font-mono font-black uppercase px-1 py-[0.5px] shrink-0 ${color.text}`}
          style={{ background: color.bg }}
        >
          {indicator.signal.replace('_', ' ')}
        </span>
      </div>

      {/* Value + sparkline */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black font-mono tabular-nums ${color.text}`}>
          {fmtVal(indicator.currentValue, indicator.unit)}
        </span>
        {indicator.history.length > 1 && (
          <MiniSparkline data={indicator.history} color={color.fill} />
        )}
      </div>
    </div>
  );
}

// ── Shared Sparkline ──

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const W = 46;
  const H = 14;
  const PAD = 1;

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2);
    const y = PAD + ((max - v) / range) * (H - PAD * 2);
    return { x, y };
  });

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={46} height={14}>
      <path d={pathD} fill="none" stroke={color} strokeWidth={1} opacity={0.7} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={1.5} fill={color} />
    </svg>
  );
}
