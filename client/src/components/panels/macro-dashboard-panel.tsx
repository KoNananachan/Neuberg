import { useMemo } from 'react';
import {
  useMacroDashboard,
  type MacroQuoteItem,
  type MacroDashboardData,
} from '../../api/hooks/use-macro-dashboard';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Format Helpers ──

function fmtPrice(n: number): string {
  if (Math.abs(n) >= 10000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (Math.abs(n) >= 100) return n.toFixed(2);
  if (Math.abs(n) >= 1) return n.toFixed(2);
  if (Math.abs(n) >= 0.01) return n.toFixed(4);
  return n.toFixed(6);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 100) return `${sign}${n.toFixed(0)}`;
  if (Math.abs(n) >= 1) return `${sign}${n.toFixed(2)}`;
  return `${sign}${n.toFixed(4)}`;
}

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const bps = n * 100;
  const sign = bps >= 0 ? '+' : '';
  return `${sign}${bps.toFixed(1)}bp`;
}

// ── Color Helpers ──

function pctColor(n: number): string {
  return n >= 0 ? 'text-bullish' : 'text-bearish';
}

function vixColor(vix: number): string {
  if (vix < 15) return 'text-emerald-400';
  if (vix <= 25) return 'text-yellow-400';
  return 'text-red-400';
}

function vixBgColor(vix: number): string {
  if (vix < 15) return 'bg-emerald-500/8';
  if (vix <= 25) return 'bg-yellow-500/8';
  return 'bg-red-500/8';
}

function riskColor(risk: string): { text: string; bg: string; dot: string } {
  switch (risk) {
    case 'Risk On':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' };
    case 'Risk Off':
      return { text: 'text-red-400', bg: 'bg-red-500/10', dot: 'bg-red-400' };
    default:
      return { text: 'text-yellow-400', bg: 'bg-yellow-500/10', dot: 'bg-yellow-400' };
  }
}

function curveColor(status: string): string {
  switch (status) {
    case 'Inverted': return 'text-red-400';
    case 'Flat': return 'text-yellow-400';
    case 'Normal': return 'text-emerald-400';
    default: return 'text-neutral-500';
  }
}

// ── Yield symbols — these display yield% not price ──

const YIELD_SYMBOLS = new Set(['^TNX', '^TYX', '^IRX']);

// ── Trend Arrow SVG ──

function TrendArrow({ positive }: { positive: boolean }) {
  return (
    <svg width="6" height="5" viewBox="0 0 6 5" className="shrink-0 inline-block">
      {positive ? (
        <path d="M3 0 L6 5 L0 5 Z" fill="#22c55e" />
      ) : (
        <path d="M3 5 L6 0 L0 0 Z" fill="#ef4444" />
      )}
    </svg>
  );
}

// ── Section Header ──

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/15">
      <div className="w-1 h-1 shrink-0" style={{ backgroundColor: color }} />
      <span
        className="text-[7px] font-black font-mono uppercase tracking-widest"
        style={{ color }}
      >
        {title}
      </span>
    </div>
  );
}

// ── Index Card (large, prominent) ──

function IndexCard({ item }: { item: MacroQuoteItem }) {
  const isUp = item.changePct >= 0;
  const heat = Math.min(Math.abs(item.changePct) / 3, 1);

  return (
    <div className="flex-1 min-w-[90px] px-2 py-1.5 border border-border/20 bg-black/40 relative overflow-hidden">
      <div
        className={`absolute inset-0 ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`}
        style={{ opacity: heat * 0.06 }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-tight truncate">
            {item.name}
          </span>
          <TrendArrow positive={isUp} />
        </div>
        <div className="text-[12px] font-mono font-bold text-white leading-tight tabular-nums">
          {fmtPrice(item.price)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(item.changePct)}`}>
            {fmtPct(item.changePct)}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 tabular-nums">
            {fmtChange(item.change)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Yield Row (for bonds) ──

function YieldRow({ item }: { item: MacroQuoteItem }) {
  const isYield = YIELD_SYMBOLS.has(item.symbol);
  // For yield symbols: up = bearish for bonds (red), down = bullish (green)
  // For bond ETFs: normal color logic
  const changeIsPositive = item.changePct >= 0;
  const colorClass = isYield
    ? (changeIsPositive ? 'text-red-400' : 'text-emerald-400')
    : pctColor(item.changePct);

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-border/10 hover:bg-white/[0.02]">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-[8px] font-mono font-bold text-blue-300 truncate">{item.name}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono font-bold text-white tabular-nums">
          {isYield ? fmtYield(item.price) : fmtPrice(item.price)}
        </span>
        <span className={`text-[8px] font-mono font-bold tabular-nums w-[52px] text-right ${colorClass}`}>
          {isYield ? fmtBps(item.change) : fmtPct(item.changePct)}
        </span>
      </div>
    </div>
  );
}

// ── Commodity Row ──

function CommodityRow({ item }: { item: MacroQuoteItem }) {
  const isUp = item.changePct >= 0;
  const heat = Math.min(Math.abs(item.changePct) / 4, 1);

  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-border/10 hover:bg-white/[0.02] relative">
      <div
        className={`absolute inset-0 ${isUp ? 'bg-emerald-500' : 'bg-red-500'}`}
        style={{ opacity: heat * 0.04 }}
      />
      <span className="text-[8px] font-mono font-bold text-blue-300 relative z-10 truncate">{item.name}</span>
      <div className="flex items-center gap-2 shrink-0 relative z-10">
        <span className="text-[9px] font-mono font-bold text-white tabular-nums">{fmtPrice(item.price)}</span>
        <span className={`text-[8px] font-mono font-bold tabular-nums w-[48px] text-right ${pctColor(item.changePct)}`}>
          {fmtPct(item.changePct)}
        </span>
      </div>
    </div>
  );
}

// ── FX Row ──

function FxRow({ item }: { item: MacroQuoteItem }) {
  return (
    <div className="flex items-center justify-between px-2 py-1 border-b border-border/10 hover:bg-white/[0.02]">
      <span className="text-[8px] font-mono font-bold text-blue-300 truncate">{item.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono font-bold text-white tabular-nums">{fmtPrice(item.price)}</span>
        <span className={`text-[8px] font-mono font-bold tabular-nums w-[48px] text-right ${pctColor(item.changePct)}`}>
          {fmtPct(item.changePct)}
        </span>
      </div>
    </div>
  );
}

// ── VIX Gauge (SVG) ──

function VixGauge({ vix, percentile }: { vix: number; percentile: number }) {
  const W = 200;
  const H = 14;
  // Bar fill based on percentile
  const fillW = (percentile / 100) * (W - 4);

  // Color stops
  const fillColor = vix < 15 ? '#22c55e' : vix <= 25 ? '#eab308' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 14 }}>
      {/* Track */}
      <rect x="0" y="2" width={W} height={H - 4} fill="rgba(255,255,255,0.04)" />
      {/* Fill */}
      <rect x="2" y="3" width={Math.max(fillW, 2)} height={H - 6} fill={fillColor} opacity={0.7} />
      {/* Zone markers */}
      <line x1={W * 0.2} y1="0" x2={W * 0.2} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <line x1={W * 0.5} y1="0" x2={W * 0.5} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <line x1={W * 0.8} y1="0" x2={W * 0.8} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    </svg>
  );
}

// ── Derived Metrics Section ──

function DerivedMetrics({ data }: { data: MacroDashboardData }) {
  const t = useT();
  const { derived } = data;
  const risk = riskColor(derived.riskAppetite);

  return (
    <div className="px-2 py-1.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {/* Yield Spread */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdYieldSpread', '2Y/10Y Spread')}
          </span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${curveColor(derived.yieldCurveStatus)}`}>
            {derived.yieldSpread != null ? `${derived.yieldSpread > 0 ? '+' : ''}${derived.yieldSpread.toFixed(2)}%` : '--'}
          </span>
        </div>

        {/* Yield Curve Status */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdCurveStatus', 'Yield Curve')}
          </span>
          <span className={`text-[7px] font-mono font-black uppercase ${curveColor(derived.yieldCurveStatus)}`}>
            {derived.yieldCurveStatus}
          </span>
        </div>

        {/* Gold/Oil Ratio */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdGoldOil', 'Gold/Oil')}
          </span>
          <span className="text-[8px] font-mono font-bold text-blue-300 tabular-nums">
            {derived.goldOilRatio != null ? derived.goldOilRatio.toFixed(1) : '--'}
          </span>
        </div>

        {/* Copper/Gold Ratio */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdCopperGold', 'Cu/Au')}
          </span>
          <span className="text-[8px] font-mono font-bold text-blue-300 tabular-nums">
            {derived.copperGoldRatio != null ? derived.copperGoldRatio.toFixed(5) : '--'}
          </span>
        </div>

        {/* Real Yield */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdRealYield', 'Real Yield Est')}
          </span>
          <span className={`text-[8px] font-mono font-bold tabular-nums ${
            derived.realYieldEstimate != null && derived.realYieldEstimate > 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {derived.realYieldEstimate != null ? `${derived.realYieldEstimate > 0 ? '+' : ''}${derived.realYieldEstimate.toFixed(2)}%` : '--'}
          </span>
        </div>

        {/* Dollar Index */}
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {tr(t, 'mdDollarIdx', 'DXY')}
          </span>
          <span className="text-[8px] font-mono font-bold text-white tabular-nums">
            {derived.dollarIndex != null ? derived.dollarIndex.toFixed(2) : '--'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Risk Gauges Section ──

function RiskGauges({ data }: { data: MacroDashboardData }) {
  const t = useT();
  const { volatility, crypto, realEstate, derived } = data;
  const risk = riskColor(derived.riskAppetite);
  const btc = crypto[0];
  const vnq = realEstate[0];

  return (
    <div className="px-2 py-1.5">
      {/* VIX */}
      <div className="mb-1.5">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-widest">
            {tr(t, 'mdVix', 'VIX')}
          </span>
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-mono font-black tabular-nums ${vixColor(volatility.vix)}`}>
              {volatility.vix.toFixed(1)}
            </span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(-volatility.changePct)}`}>
              {fmtPct(volatility.changePct)}
            </span>
          </div>
        </div>
        <VixGauge vix={volatility.vix} percentile={volatility.percentile} />
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[6px] font-mono text-emerald-600">LOW</span>
          <span className="text-[6px] font-mono text-neutral-600 tabular-nums">
            {tr(t, 'mdPercentile', 'Pctl')}: {volatility.percentile}
          </span>
          <span className="text-[6px] font-mono text-red-600">HIGH</span>
        </div>
      </div>

      {/* Risk Appetite Badge */}
      <div className={`flex items-center gap-2 px-2 py-1 border border-border/20 ${risk.bg} mb-1.5`}>
        <div className={`w-1.5 h-1.5 shrink-0 animate-pulse ${risk.dot}`} />
        <span className={`text-[9px] font-mono font-black uppercase tracking-tight ${risk.text}`}>
          {derived.riskAppetite}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto uppercase">
          {tr(t, 'mdRiskAppetite', 'Risk Appetite')}
        </span>
      </div>

      {/* BTC + VNQ row */}
      <div className="grid grid-cols-2 gap-1">
        {btc && (
          <div className="flex flex-col px-2 py-1 border border-border/20 bg-black/40">
            <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">BTC</span>
            <span className="text-[10px] font-mono font-bold text-white tabular-nums leading-tight">
              {fmtPrice(btc.price)}
            </span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(btc.changePct)}`}>
              {fmtPct(btc.changePct)}
            </span>
          </div>
        )}
        {vnq && (
          <div className="flex flex-col px-2 py-1 border border-border/20 bg-black/40">
            <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'mdReit', 'REIT')}
            </span>
            <span className="text-[10px] font-mono font-bold text-white tabular-nums leading-tight">
              {fmtPrice(vnq.price)}
            </span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${pctColor(vnq.changePct)}`}>
              {fmtPct(vnq.changePct)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar (top) ──

function SummaryBar({ data }: { data: MacroDashboardData }) {
  const allQuotes: MacroQuoteItem[] = useMemo(() => [
    ...data.indices,
    ...data.bonds.filter((b) => !YIELD_SYMBOLS.has(b.symbol)),
    ...data.commodities,
    ...data.fx,
    ...data.crypto,
    ...data.realEstate,
  ], [data]);

  const up = allQuotes.filter((q) => q.changePct > 0).length;
  const down = allQuotes.filter((q) => q.changePct < 0).length;
  const risk = riskColor(data.derived.riskAppetite);

  return (
    <div className="flex items-center gap-2 px-2 py-1 border-b border-border/30 bg-[#050505] overflow-x-auto no-scrollbar shrink-0">
      {/* Risk badge */}
      <div className={`flex items-center gap-1 px-1.5 py-0.5 shrink-0 border border-border/20 ${risk.bg}`}>
        <div className={`w-1 h-1 shrink-0 animate-pulse ${risk.dot}`} />
        <span className={`text-[8px] font-mono font-black tracking-tight ${risk.text}`}>
          {data.derived.riskAppetite.toUpperCase()}
        </span>
      </div>

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* VIX */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[7px] font-mono text-neutral-600">VIX</span>
        <span className={`text-[8px] font-mono font-bold ${vixColor(data.volatility.vix)}`}>
          {data.volatility.vix.toFixed(1)}
        </span>
      </div>

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* Breadth */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-[8px] font-mono text-bullish font-bold">{up}A</span>
        <span className="text-[8px] font-mono text-bearish font-bold">{down}D</span>
      </div>

      <div className="w-px h-3 bg-border/30 shrink-0" />

      {/* Yield curve */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-[7px] font-mono text-neutral-600">CURVE</span>
        <span className={`text-[7px] font-mono font-black ${curveColor(data.derived.yieldCurveStatus)}`}>
          {data.derived.yieldCurveStatus.toUpperCase()}
        </span>
      </div>

      {/* DXY */}
      {data.derived.dollarIndex != null && (
        <>
          <div className="w-px h-3 bg-border/30 shrink-0" />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[7px] font-mono text-neutral-600">DXY</span>
            <span className="text-[8px] font-mono font-bold text-white">{data.derived.dollarIndex.toFixed(1)}</span>
          </div>
        </>
      )}
    </div>
  );
}

// ── Yield Curve Mini Visualization ──

function YieldCurveMini({ bonds }: { bonds: MacroQuoteItem[] }) {
  const t = useT();
  const yieldMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const b of bonds) {
      if (YIELD_SYMBOLS.has(b.symbol)) {
        m.set(b.symbol, b.price);
      }
    }
    return m;
  }, [bonds]);

  const points: { label: string; value: number }[] = [
    { label: '3M', value: yieldMap.get('^IRX') ?? 0 },
    { label: '10Y', value: yieldMap.get('^TNX') ?? 0 },
    { label: '30Y', value: yieldMap.get('^TYX') ?? 0 },
  ];

  // Scale for SVG
  const W = 160;
  const H = 40;
  const PAD = 10;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals) - 0.3;
  const max = Math.max(...vals) + 0.3;
  const range = max - min || 1;

  const svgPoints = points.map((p, i) => {
    const x = PAD + (i / (points.length - 1)) * (W - PAD * 2);
    const y = H - PAD - ((p.value - min) / range) * (H - PAD * 2);
    return { x, y, ...p };
  });

  const pathD = svgPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');

  // Check for inversion (3M > 10Y)
  const isInverted = vals[0] > vals[1];

  return (
    <div className="px-2 py-1 border-b border-border/15">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-widest">
          {tr(t, 'mdYieldCurve', 'Yield Curve')}
        </span>
        {isInverted && (
          <span className="text-[6px] font-mono font-black text-red-400 uppercase tracking-wider px-1 py-0.5 bg-red-500/10 border border-red-500/20">
            {tr(t, 'mdInverted', 'INVERTED')}
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 44 }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((pct) => (
          <line
            key={pct}
            x1={PAD}
            y1={H - PAD - pct * (H - PAD * 2)}
            x2={W - PAD}
            y2={H - PAD - pct * (H - PAD * 2)}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="0.5"
          />
        ))}

        {/* Curve line */}
        <path d={pathD} fill="none" stroke={isInverted ? '#ef4444' : '#60a5fa'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points + labels */}
        {svgPoints.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="2.5" fill={isInverted ? '#ef4444' : '#60a5fa'} />
            <text x={p.x} y={H - 1} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="5.5" fontFamily="monospace">
              {p.label}
            </text>
            <text x={p.x} y={p.y - 5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="5.5" fontFamily="monospace" fontWeight="bold">
              {p.value.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ── Main Panel ──

export function MacroDashboardPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMacroDashboard();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <rect x="0" y="4" width="3" height="10" fill="#60a5fa" opacity="0.9" />
            <rect x="4" y="2" width="3" height="12" fill="#60a5fa" opacity="0.7" />
            <rect x="8" y="6" width="3" height="8" fill="#60a5fa" opacity="0.5" />
            <rect x="12" y="0" width="2" height="14" fill="#60a5fa" opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-blue-400">
            {tr(t, 'mdTitle', 'Macro Dashboard')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-blue-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      {data && <SummaryBar data={data} />}

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-blue-400 uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </span>
        </div>
      )}

      {/* No data */}
      {!data && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {data && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Section 1: Market Indices */}
          <SectionHeader title={tr(t, 'mdIndices', 'Market Indices')} color="#60a5fa" />
          <div className="flex flex-wrap gap-1 px-1.5 py-1">
            {data.indices.map((item) => (
              <IndexCard key={item.symbol} item={item} />
            ))}
          </div>

          {/* Section 2: Rates & Bonds */}
          <SectionHeader title={tr(t, 'mdBonds', 'Rates & Bonds')} color="#8b5cf6" />
          <YieldCurveMini bonds={data.bonds} />
          {data.bonds.map((item) => (
            <YieldRow key={item.symbol} item={item} />
          ))}

          {/* Section 3: Commodities */}
          <SectionHeader title={tr(t, 'mdCommodities', 'Commodities')} color="#f59e0b" />
          {data.commodities.map((item) => (
            <CommodityRow key={item.symbol} item={item} />
          ))}
          {/* Derived commodity ratios */}
          <div className="flex items-center gap-3 px-2 py-1 border-b border-border/10 bg-black/40">
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono text-neutral-600 uppercase">Au/Oil</span>
              <span className="text-[8px] font-mono font-bold text-amber-400 tabular-nums">
                {data.derived.goldOilRatio != null ? data.derived.goldOilRatio.toFixed(1) : '--'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono text-neutral-600 uppercase">Cu/Au</span>
              <span className="text-[8px] font-mono font-bold text-cyan-400 tabular-nums">
                {data.derived.copperGoldRatio != null ? data.derived.copperGoldRatio.toFixed(5) : '--'}
              </span>
            </div>
          </div>

          {/* Section 4: FX */}
          <SectionHeader title={tr(t, 'mdFx', 'Foreign Exchange')} color="#06b6d4" />
          {data.fx.map((item) => (
            <FxRow key={item.symbol} item={item} />
          ))}

          {/* Section 5: Risk Gauges */}
          <SectionHeader title={tr(t, 'mdRisk', 'Risk Gauges')} color="#a855f7" />
          <RiskGauges data={data} />

          {/* Section 6: Derived Metrics */}
          <SectionHeader title={tr(t, 'mdDerived', 'Derived Metrics')} color="#64748b" />
          <DerivedMetrics data={data} />

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
