import { useState, useMemo } from 'react';
import {
  useCommoditySpreads,
  type CommoditySpreadsData,
  type CommoditySpread,
} from '../../api/hooks/use-commodity-spreads';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

type CategoryFilter = 'all' | 'energy' | 'metals' | 'agriculture';

const ACCENT = '#eab308'; // yellow-500

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'energy', label: 'Energy' },
  { key: 'metals', label: 'Metals' },
  { key: 'agriculture', label: 'Agriculture' },
];

// ── Formatting helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtSpread(n: number, type: 'ratio' | 'absolute'): string {
  if (type === 'ratio') return n.toFixed(4);
  return n.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalColor(signal: string): string {
  if (signal === 'cheap') return 'text-green-400';
  if (signal === 'expensive') return 'text-red-400';
  return 'text-yellow-400';
}

function signalBg(signal: string): string {
  if (signal === 'cheap') return 'bg-green-500/10 border border-green-500/30';
  if (signal === 'expensive') return 'bg-red-500/10 border border-red-500/30';
  return 'bg-yellow-500/10 border border-yellow-500/30';
}

function directionArrow(direction: string): string {
  if (direction === 'widening') return '\u2191';
  if (direction === 'narrowing') return '\u2193';
  return '\u2194';
}

function directionColor(direction: string): string {
  if (direction === 'widening') return 'text-red-400';
  if (direction === 'narrowing') return 'text-green-400';
  return 'text-yellow-400';
}

function categoryBadgeStyle(category: string): string {
  if (category === 'energy') return 'text-orange-400 bg-orange-500/10 border border-orange-500/30';
  if (category === 'metals') return 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/30';
  return 'text-lime-400 bg-lime-500/10 border border-lime-500/30';
}

function zScoreBarColor(z: number): string {
  if (z >= 1.5) return '#ef4444';
  if (z >= 0.5) return '#f97316';
  if (z <= -1.5) return '#22c55e';
  if (z <= -0.5) return '#3b82f6';
  return '#eab308';
}

// ── Main Panel ──

export function CommoditySpreadsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCommoditySpreads();
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (category === 'all') return data.spreads;
    return data.spreads.filter((s) => s.category === category);
  }, [data, category]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-500">
            {tr(t, 'cspCommoditySpreads', 'Commodity Spreads')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-500 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategory(tab.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              category === tab.key
                ? 'border-yellow-500 text-yellow-500'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tr(t, `csp_${tab.key}`, tab.label)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-500 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cspNoData', 'No data available')}
          </div>
        )}

        {data && filtered.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'cspNoSpreads', 'No spreads in this category')}
          </div>
        )}

        {filtered.map((spread) => (
          <SpreadCard key={spread.name} spread={spread} />
        ))}
      </div>

      {/* Category summary bar */}
      {data && <SummaryBar data={data} t={t} />}
    </div>
  );
}

// ── Spread Card ──

function SpreadCard({ spread }: { spread: CommoditySpread }) {
  const {
    name,
    category,
    signal,
    longLeg,
    shortLeg,
    currentSpread,
    spreadType,
    avg20d,
    avg60d,
    zScore,
    percentile,
    direction,
    description,
    history,
  } = spread;

  return (
    <div className="border-b border-border/20 px-3 py-2">
      {/* Row 1: Name + badges */}
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] font-mono font-bold text-white">{name}</span>
        <span className={`text-[6px] font-mono font-bold px-1 py-px uppercase ${categoryBadgeStyle(category)}`}>
          {category}
        </span>
        <span className={`text-[6px] font-mono font-bold px-1 py-px uppercase ${signalColor(signal)} ${signalBg(signal)}`}>
          {signal}
        </span>
      </div>

      {/* Row 2: Two legs side by side */}
      <div className="flex gap-3 mb-1.5">
        <LegDisplay label="LONG" leg={longLeg} />
        <LegDisplay label="SHORT" leg={shortLeg} />
      </div>

      {/* Row 3: Current spread + direction */}
      <div className="flex items-baseline gap-2 mb-1.5">
        <span className="text-[12px] font-mono font-bold text-white">
          {fmtSpread(currentSpread, spreadType)}
        </span>
        <span className={`text-[9px] font-mono font-bold ${directionColor(direction)}`}>
          {directionArrow(direction)} {direction.toUpperCase()}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          20d: {fmtSpread(avg20d, spreadType)}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          60d: {fmtSpread(avg60d, spreadType)}
        </span>
      </div>

      {/* Row 4: Z-score bar */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Z-Score</span>
          <span className="text-[7px] font-mono font-bold text-white">
            {zScore >= 0 ? '+' : ''}{zScore.toFixed(2)}
          </span>
        </div>
        <ZScoreBar zScore={zScore} />
      </div>

      {/* Row 5: Percentile bar */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">Percentile</span>
          <span className="text-[7px] font-mono font-bold text-white">{percentile}%</span>
        </div>
        <PercentileBar percentile={percentile} />
      </div>

      {/* Row 6: Sparkline */}
      {history.length >= 2 && <SpreadSparkline history={history} direction={direction} />}

      {/* Row 7: Description */}
      <div className="mt-1">
        <span className="text-[7px] font-mono text-neutral-600 leading-tight">
          {description}
        </span>
      </div>
    </div>
  );
}

// ── Leg Display ──

function LegDisplay({ label, leg }: { label: string; leg: CommoditySpread['longLeg'] }) {
  return (
    <div className="flex-1">
      <div className="text-[6px] font-mono font-bold text-neutral-600 uppercase mb-0.5">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[8px] font-mono font-bold text-white">{leg.symbol}</span>
        <span className="text-[8px] font-mono text-white">{fmtPrice(leg.price)}</span>
        <span className={`text-[7px] font-mono font-bold ${changeColor(leg.changePct)}`}>
          {fmtPct(leg.changePct)}
        </span>
      </div>
    </div>
  );
}

// ── Z-Score Bar (centered at 0) ──

function ZScoreBar({ zScore }: { zScore: number }) {
  // Clamp to [-3, 3] for display
  const clamped = Math.max(-3, Math.min(3, zScore));
  // Center is at 50%, each unit is ~16.67%
  const center = 50;
  const offset = (clamped / 3) * 50;
  const left = offset >= 0 ? center : center + offset;
  const width = Math.abs(offset);
  const color = zScoreBarColor(zScore);

  return (
    <svg viewBox="0 0 200 8" className="w-full" style={{ height: 8 }}>
      {/* Background */}
      <rect x="0" y="0" width="200" height="8" fill="rgba(255,255,255,0.03)" />
      {/* Center line */}
      <line x1="100" y1="0" x2="100" y2="8" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Z-score bar */}
      <rect
        x={left * 2}
        y="1"
        width={width * 2}
        height="6"
        fill={color}
        opacity="0.7"
      />
      {/* Tick marks at -2, -1, 0, +1, +2 */}
      {[-2, -1, 0, 1, 2].map((tick) => {
        const x = 100 + (tick / 3) * 100;
        return (
          <line
            key={tick}
            x1={x}
            y1="0"
            x2={x}
            y2="8"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.5"
          />
        );
      })}
    </svg>
  );
}

// ── Percentile Bar ──

function PercentileBar({ percentile }: { percentile: number }) {
  const color =
    percentile >= 80 ? '#ef4444' :
    percentile >= 60 ? '#f97316' :
    percentile <= 20 ? '#22c55e' :
    percentile <= 40 ? '#3b82f6' :
    '#eab308';

  return (
    <svg viewBox="0 0 200 6" className="w-full" style={{ height: 6 }}>
      {/* Background */}
      <rect x="0" y="0" width="200" height="6" fill="rgba(255,255,255,0.03)" />
      {/* Fill */}
      <rect x="0" y="0" width={percentile * 2} height="6" fill={color} opacity="0.5" />
      {/* Marker */}
      <rect x={percentile * 2 - 1} y="0" width="2" height="6" fill={color} />
      {/* Quarter markers */}
      {[25, 50, 75].map((mark) => (
        <line
          key={mark}
          x1={mark * 2}
          y1="0"
          x2={mark * 2}
          y2="6"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      ))}
    </svg>
  );
}

// ── Spread Sparkline ──

function SpreadSparkline({
  history,
  direction,
}: {
  history: number[];
  direction: string;
}) {
  const W = 200;
  const H = 40;
  const PAD_X = 2;
  const PAD_Y = 4;

  const path = useMemo(() => {
    if (history.length < 2) return null;

    const minV = Math.min(...history);
    const maxV = Math.max(...history);
    const rangeV = maxV - minV || 0.0001;

    const scaleX = (i: number) =>
      PAD_X + (i / (history.length - 1)) * (W - PAD_X * 2);
    const scaleY = (v: number) =>
      PAD_Y + ((maxV - v) / rangeV) * (H - PAD_Y * 2);

    const linePath = history
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i).toFixed(1)},${scaleY(v).toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${scaleX(history.length - 1).toFixed(1)},${H} L ${scaleX(0).toFixed(1)},${H} Z`;

    return {
      linePath,
      fillPath,
      lastX: scaleX(history.length - 1),
      lastY: scaleY(history[history.length - 1]),
    };
  }, [history]);

  const lineColor =
    direction === 'narrowing' ? '#4ade80' :
    direction === 'widening' ? '#f87171' :
    '#facc15';

  const fillColor =
    direction === 'narrowing' ? 'rgba(74,222,128,0.06)' :
    direction === 'widening' ? 'rgba(248,113,113,0.06)' :
    'rgba(250,204,21,0.06)';

  if (!path) return null;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 36 }}>
      <path d={path.fillPath} fill={fillColor} />
      <path d={path.linePath} fill="none" stroke={lineColor} strokeWidth={1.2} />
      <circle cx={path.lastX} cy={path.lastY} r={1.5} fill={lineColor} />
    </svg>
  );
}

// ── Summary Bar ──

function SummaryBar({
  data,
  t,
}: {
  data: CommoditySpreadsData;
  t: ReturnType<typeof useT>;
}) {
  const { summary } = data;

  const items = [
    { label: tr(t, 'cspEnergy', 'Energy'), value: summary.energySentiment },
    { label: tr(t, 'cspMetals', 'Metals'), value: summary.metalsSentiment },
    { label: tr(t, 'cspAgriculture', 'Agriculture'), value: summary.agSentiment },
  ];

  return (
    <div className="border-t border-border/30 bg-[#050505] px-3 py-1.5 shrink-0">
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const isElevated = item.value.toLowerCase().includes('elevated');
          const isCompressed = item.value.toLowerCase().includes('compressed');
          const color = isElevated ? 'text-red-400' : isCompressed ? 'text-green-400' : 'text-yellow-400';

          return (
            <div key={item.label}>
              <div className="text-[7px] font-mono font-bold text-neutral-600 uppercase tracking-wider">
                {item.label}
              </div>
              <div className={`text-[7px] font-mono font-bold ${color} truncate`}>
                {item.value}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 pt-1 border-t border-border/10">
        <span className="text-[7px] font-mono text-neutral-700">
          {tr(t, 'cspLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
