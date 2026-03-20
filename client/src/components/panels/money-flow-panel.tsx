import { useState } from 'react';
import { useMoneyFlow, type FlowData } from '../../api/hooks/use-money-flow';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

// i18n helper with fallback
type Tab = 'overview' | 'sectors' | 'fixed_income';

// ── Number formatting ──

function fmtFlow(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function fmtFlowSigned(n: number): string {
  const prefix = n > 0 ? '+$' : n < 0 ? '-$' : '$';
  return prefix + fmtFlow(Math.abs(n));
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

// ── Color helpers ──

function mfiColor(mfi: number): string {
  if (mfi <= 20) return '#4ade80'; // oversold = green (buy opportunity)
  if (mfi <= 40) return '#86efac';
  if (mfi <= 60) return '#fbbf24'; // neutral = amber
  if (mfi <= 80) return '#f87171';
  return '#ef4444'; // overbought = red
}

function flowColor(n: number): string {
  if (n > 0) return '#34d399';
  if (n < 0) return '#f87171';
  return 'rgba(255,255,255,0.3)';
}

function signalBadge(signal: 'inflow' | 'outflow' | 'neutral'): { text: string; color: string; bg: string } {
  switch (signal) {
    case 'inflow': return { text: 'INFLOW', color: '#34d399', bg: 'rgba(52,211,153,0.1)' };
    case 'outflow': return { text: 'OUTFLOW', color: '#f87171', bg: 'rgba(248,113,113,0.1)' };
    default: return { text: 'NEUTRAL', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── MFI Gauge (mini semicircle) ──

function MfiGauge({ value, size = 32 }: { value: number; size?: number }) {
  const CX = 50;
  const CY = 45;
  const R = 35;
  const SW = 5;

  const startAngle = Math.PI;
  const totalAngle = Math.PI;

  const needleAngle = startAngle - (value / 100) * totalAngle;
  const needleX = CX + (R - 3) * Math.cos(needleAngle);
  const needleY = CY - (R - 3) * Math.sin(needleAngle);

  const zones = [
    { from: 0, to: 20, color: '#4ade80' },
    { from: 20, to: 40, color: '#86efac' },
    { from: 40, to: 60, color: '#fbbf24' },
    { from: 60, to: 80, color: '#f87171' },
    { from: 80, to: 100, color: '#ef4444' },
  ];

  function arcPath(fromPct: number, toPct: number): string {
    const a1 = startAngle - (fromPct / 100) * totalAngle;
    const a2 = startAngle - (toPct / 100) * totalAngle;
    const x1 = CX + R * Math.cos(a1);
    const y1 = CY - R * Math.sin(a1);
    const x2 = CX + R * Math.cos(a2);
    const y2 = CY - R * Math.sin(a2);
    const large = (toPct - fromPct) > 50 ? 1 : 0;
    return `M ${x1},${y1} A ${R},${R} 0 ${large} 0 ${x2},${y2}`;
  }

  const color = mfiColor(value);

  return (
    <svg viewBox="0 0 100 52" width={size} height={size * 0.52}>
      {/* Background */}
      <path d={arcPath(0, 100)} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={SW} />
      {/* Zone arcs */}
      {zones.map(z => (
        <path key={z.from} d={arcPath(z.from, z.to)} fill="none" stroke={z.color} strokeWidth={SW} opacity={0.35} />
      ))}
      {/* Needle */}
      <line x1={CX} y1={CY} x2={needleX} y2={needleY} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={2} fill={color} />
      {/* Value */}
      <text x={CX} y={CY + 2} textAnchor="middle" fill="white" fontSize={10} fontFamily="monospace" fontWeight="900" dominantBaseline="hanging">
        {Math.round(value)}
      </text>
    </svg>
  );
}

// ── Volume Ratio Bar ──

function VolumeBar({ ratio }: { ratio: number }) {
  const pct = Math.min(ratio * 50, 100); // 2x avg = full bar
  const color = ratio >= 1.5 ? '#34d399' : ratio >= 1.0 ? '#fbbf24' : 'rgba(255,255,255,0.2)';
  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-white/[0.03] rounded-sm overflow-hidden">
        <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[7px] font-mono" style={{ color }}>{ratio.toFixed(2)}x</span>
    </div>
  );
}

// ── ETF Flow Card ──

function FlowCard({ flow }: { flow: FlowData }) {
  const badge = signalBadge(flow.signal);
  const changeColor = flow.change >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="border border-border/20 bg-white/[0.01] px-2 py-1.5 flex flex-col gap-1">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-black font-mono text-neutral/90">{flow.symbol}</span>
          <span className="text-[7px] font-mono text-neutral/30 truncate max-w-[60px]">{flow.name}</span>
        </div>
        <span
          className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5 rounded-sm"
          style={{ color: badge.color, backgroundColor: badge.bg }}
        >
          {badge.text}
        </span>
      </div>

      {/* Price + MFI row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-neutral/80">${fmtPrice(flow.price)}</span>
          <span className={`text-[8px] font-mono font-bold ${changeColor}`}>{fmtPct(flow.change)}</span>
        </div>
        <MfiGauge value={flow.mfi} size={28} />
      </div>

      {/* Flow + Volume row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-neutral/30 uppercase">5D FLOW</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(flow.netFlow5d) }}>
              {fmtFlowSigned(flow.netFlow5d)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[6px] font-mono text-neutral/30 uppercase">1D FLOW</span>
            <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(flow.netFlow1d) }}>
              {fmtFlowSigned(flow.netFlow1d)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[6px] font-mono text-neutral/30 uppercase">VOL/AVG</span>
          <VolumeBar ratio={flow.volumeRatio} />
        </div>
      </div>
    </div>
  );
}

// ── Sector Bar Chart (SVG) ──

function SectorBarChart({ flows }: { flows: FlowData[] }) {
  const sorted = [...flows].sort((a, b) => Math.abs(b.netFlow5d) - Math.abs(a.netFlow5d));
  const maxFlow = Math.max(...sorted.map(f => Math.abs(f.netFlow5d)), 1);

  const BAR_HEIGHT = 14;
  const GAP = 2;
  const LABEL_W = 40;
  const VALUE_W = 50;
  const CHART_W = 200;
  const W = LABEL_W + CHART_W + VALUE_W + 10;
  const H = sorted.length * (BAR_HEIGHT + GAP) + 4;
  const CENTER_X = LABEL_W + CHART_W / 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
      {/* Center line */}
      <line x1={CENTER_X} y1={0} x2={CENTER_X} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />

      {sorted.map((flow, i) => {
        const y = i * (BAR_HEIGHT + GAP) + 2;
        const barW = (Math.abs(flow.netFlow5d) / maxFlow) * (CHART_W / 2 - 4);
        const isPositive = flow.netFlow5d >= 0;
        const barX = isPositive ? CENTER_X : CENTER_X - barW;
        const color = isPositive ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)';
        const textColor = isPositive ? '#34d399' : '#f87171';

        return (
          <g key={flow.symbol}>
            {/* Label */}
            <text
              x={LABEL_W - 4}
              y={y + BAR_HEIGHT / 2 + 3}
              textAnchor="end"
              fill="rgba(255,255,255,0.6)"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {flow.symbol}
            </text>

            {/* Bar */}
            <rect x={barX} y={y + 1} width={Math.max(barW, 1)} height={BAR_HEIGHT - 2} fill={color} rx={1} />

            {/* Value */}
            <text
              x={LABEL_W + CHART_W + 4}
              y={y + BAR_HEIGHT / 2 + 3}
              textAnchor="start"
              fill={textColor}
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {fmtFlowSigned(flow.netFlow5d)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Fixed Income Section ──

function FixedIncomeTab({ flows, allFlows }: { flows: FlowData[]; allFlows: FlowData[] }) {
  const t = useT();

  // Risk-on vs risk-off: HYG inflow = risk-on, TLT inflow = risk-off
  const hyg = flows.find(f => f.symbol === 'HYG');
  const tlt = flows.find(f => f.symbol === 'TLT');
  const hygFlow = hyg?.netFlow5d ?? 0;
  const tltFlow = tlt?.netFlow5d ?? 0;

  const riskSignal = hygFlow > tltFlow ? 'RISK-ON' : hygFlow < tltFlow ? 'RISK-OFF' : 'NEUTRAL';
  const riskColor = riskSignal === 'RISK-ON' ? '#34d399' : riskSignal === 'RISK-OFF' ? '#f87171' : '#fbbf24';

  // Overall equity vs bond flow for risk appetite
  const equityFlows = allFlows.filter(f => f.category === 'index' || f.category === 'sector');
  const bondFlows = flows;
  const totalEquityFlow = equityFlows.reduce((sum, f) => sum + f.netFlow5d, 0);
  const totalBondFlow = bondFlows.reduce((sum, f) => sum + f.netFlow5d, 0);

  return (
    <div className="flex flex-col gap-2">
      {/* Risk indicator */}
      <div className="px-3 py-2 border-b border-border/20">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
            {tr(t, 'mfBondRisk', 'Credit Risk Signal')}
          </span>
          <span className="text-[10px] font-black font-mono" style={{ color: riskColor }}>{riskSignal}</span>
        </div>
        <div className="flex items-center gap-2 text-[7px] font-mono text-neutral/30">
          <span>HYG 5D: <span style={{ color: flowColor(hygFlow) }}>{fmtFlowSigned(hygFlow)}</span></span>
          <span>|</span>
          <span>TLT 5D: <span style={{ color: flowColor(tltFlow) }}>{fmtFlowSigned(tltFlow)}</span></span>
        </div>
      </div>

      {/* Equity vs Bond flow comparison */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfFlowComparison', 'Equity vs Bond Flows (5D)')}
        </span>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-mono text-neutral/30">EQUITY</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(totalEquityFlow) }}>
                {fmtFlowSigned(totalEquityFlow)}
              </span>
            </div>
            <div className="h-2 bg-white/[0.03] rounded-sm overflow-hidden">
              {(() => {
                const total = Math.abs(totalEquityFlow) + Math.abs(totalBondFlow);
                const pct = total > 0 ? (Math.abs(totalEquityFlow) / total) * 100 : 50;
                return <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: flowColor(totalEquityFlow) }} />;
              })()}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[7px] font-mono text-neutral/30">BOND</span>
              <span className="text-[8px] font-mono font-bold" style={{ color: flowColor(totalBondFlow) }}>
                {fmtFlowSigned(totalBondFlow)}
              </span>
            </div>
            <div className="h-2 bg-white/[0.03] rounded-sm overflow-hidden">
              {(() => {
                const total = Math.abs(totalEquityFlow) + Math.abs(totalBondFlow);
                const pct = total > 0 ? (Math.abs(totalBondFlow) / total) * 100 : 50;
                return <div className="h-full rounded-sm" style={{ width: `${pct}%`, backgroundColor: flowColor(totalBondFlow) }} />;
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Bond ETF cards */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1 block">
          {tr(t, 'mfBondEtfs', 'Bond ETF Flows')}
        </span>
        <div className="flex flex-col gap-1">
          {flows.map(f => <FlowCard key={f.symbol} flow={f} />)}
        </div>
      </div>
    </div>
  );
}

// ── Flow Summary Footer ──

function FlowSummary({ flows }: { flows: FlowData[] }) {
  const t = useT();

  // Risk appetite: equity inflows vs bond inflows
  const equityFlows = flows.filter(f => f.category === 'index' || f.category === 'sector');
  const bondFlows = flows.filter(f => f.category === 'fixed_income');
  const totalEquity = equityFlows.reduce((s, f) => s + f.netFlow5d, 0);
  const totalBond = bondFlows.reduce((s, f) => s + f.netFlow5d, 0);

  let riskAppetite: string;
  let riskColor: string;
  if (totalEquity > 0 && totalEquity > Math.abs(totalBond)) {
    riskAppetite = 'HIGH';
    riskColor = '#34d399';
  } else if (totalBond > 0 && totalBond > Math.abs(totalEquity)) {
    riskAppetite = 'LOW';
    riskColor = '#f87171';
  } else {
    riskAppetite = 'MODERATE';
    riskColor = '#fbbf24';
  }

  // Top inflows / outflows
  const sorted = [...flows].sort((a, b) => b.netFlow5d - a.netFlow5d);
  const topInflows = sorted.filter(f => f.netFlow5d > 0).slice(0, 3);
  const topOutflows = sorted.filter(f => f.netFlow5d < 0).slice(-3).reverse();

  // Total market flow
  const totalFlow = flows.reduce((s, f) => s + f.netFlow5d, 0);

  return (
    <div className="border-t border-border/20 px-3 py-2 flex flex-col gap-1.5">
      {/* Risk Appetite */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfRiskAppetite', 'Risk Appetite')}
        </span>
        <span className="text-[10px] font-black font-mono" style={{ color: riskColor }}>{riskAppetite}</span>
      </div>

      {/* Total Market Flow */}
      <div className="flex items-center justify-between">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfTotalFlow', 'Total Market Flow (5D)')}
        </span>
        <span className="text-[9px] font-mono font-bold" style={{ color: flowColor(totalFlow) }}>
          {fmtFlowSigned(totalFlow)}
        </span>
      </div>

      {/* Top Inflows / Outflows */}
      <div className="flex gap-3 mt-0.5">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-[7px] font-mono text-emerald-400/70 uppercase">
              {tr(t, 'mfTopInflows', 'Top Inflows')}
            </span>
          </div>
          {topInflows.length === 0 && <span className="text-[7px] font-mono text-neutral/20">None</span>}
          {topInflows.map(f => (
            <div key={f.symbol} className="flex items-center justify-between py-0.5">
              <span className="text-[8px] font-mono font-bold text-neutral/60">{f.symbol}</span>
              <span className="text-[8px] font-mono font-bold text-emerald-400">{fmtFlowSigned(f.netFlow5d)}</span>
            </div>
          ))}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-2.5 h-2.5 text-red-400" />
            <span className="text-[7px] font-mono text-red-400/70 uppercase">
              {tr(t, 'mfTopOutflows', 'Top Outflows')}
            </span>
          </div>
          {topOutflows.length === 0 && <span className="text-[7px] font-mono text-neutral/20">None</span>}
          {topOutflows.map(f => (
            <div key={f.symbol} className="flex items-center justify-between py-0.5">
              <span className="text-[8px] font-mono font-bold text-neutral/60">{f.symbol}</span>
              <span className="text-[8px] font-mono font-bold text-red-400">{fmtFlowSigned(f.netFlow5d)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Summary Bar (total inflow/outflow) ──

function SummaryBar({ flows }: { flows: FlowData[] }) {
  const inflows = flows.filter(f => f.netFlow5d > 0);
  const outflows = flows.filter(f => f.netFlow5d < 0);
  const totalIn = inflows.reduce((s, f) => s + f.netFlow5d, 0);
  const totalOut = Math.abs(outflows.reduce((s, f) => s + f.netFlow5d, 0));
  const total = totalIn + totalOut;
  const inPct = total > 0 ? (totalIn / total) * 100 : 50;

  return (
    <div className="px-3 py-1.5 border-b border-border/20">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[7px] font-mono text-emerald-400">
          INFLOWS: {inflows.length} ETFs | {fmtFlowSigned(totalIn)}
        </span>
        <span className="text-[7px] font-mono text-red-400">
          OUTFLOWS: {outflows.length} ETFs | -${fmtFlow(totalOut)}
        </span>
      </div>
      <div className="flex h-2 rounded-sm overflow-hidden">
        <div className="bg-emerald-500/60 transition-all" style={{ width: `${inPct}%` }} />
        <div className="bg-red-500/60 transition-all" style={{ width: `${100 - inPct}%` }} />
      </div>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ flows }: { flows: FlowData[] }) {
  const t = useT();
  const indexFlows = flows.filter(f => f.category === 'index');
  const commodityFlows = flows.filter(f => f.category === 'commodity');
  const intlFlows = flows.filter(f => f.category === 'international');

  return (
    <div className="flex flex-col gap-1.5">
      <SummaryBar flows={flows} />

      {/* Index ETFs */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfMajorIndices', 'Major Indices')}
        </span>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {indexFlows.map(f => <FlowCard key={f.symbol} flow={f} />)}
        </div>
      </div>

      {/* Commodities */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfCommodities', 'Commodities')}
        </span>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {commodityFlows.map(f => <FlowCard key={f.symbol} flow={f} />)}
        </div>
      </div>

      {/* International */}
      <div className="px-3 py-1">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfInternational', 'International')}
        </span>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {intlFlows.map(f => <FlowCard key={f.symbol} flow={f} />)}
        </div>
      </div>

      {/* Flow Summary */}
      <FlowSummary flows={flows} />
    </div>
  );
}

// ── Sectors Tab ──

function SectorsTab({ flows }: { flows: FlowData[] }) {
  const t = useT();
  const sectorFlows = flows.filter(f => f.category === 'sector');

  return (
    <div className="flex flex-col gap-1.5">
      {/* Bar chart */}
      <div className="px-3 py-2">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider">
          {tr(t, 'mfSectorNetFlows', 'Sector Net Flows (5D)')}
        </span>
        <div className="mt-1.5">
          <SectorBarChart flows={sectorFlows} />
        </div>
      </div>

      {/* MFI table */}
      <div className="px-3 py-1 border-t border-border/20">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider mb-1 block">
          {tr(t, 'mfSectorDetails', 'Sector Detail')}
        </span>
        {/* Table header */}
        <div className="flex items-center py-0.5 border-b border-border/10 text-[7px] font-mono text-neutral/30 uppercase">
          <span className="w-10">SYM</span>
          <span className="flex-1">NAME</span>
          <span className="w-14 text-right">PRICE</span>
          <span className="w-14 text-right">CHG%</span>
          <span className="w-10 text-right">MFI</span>
          <span className="w-16 text-right">5D FLOW</span>
          <span className="w-12 text-right">SIGNAL</span>
        </div>
        {sectorFlows.map(f => {
          const badge = signalBadge(f.signal);
          const changeColor = f.change >= 0 ? 'text-emerald-400' : 'text-red-400';
          return (
            <div key={f.symbol} className="flex items-center py-0.5 border-b border-border/5 text-[8px] font-mono">
              <span className="w-10 font-bold text-neutral/80">{f.symbol}</span>
              <span className="flex-1 text-neutral/40 truncate">{f.name}</span>
              <span className="w-14 text-right text-neutral/60">${fmtPrice(f.price)}</span>
              <span className={`w-14 text-right font-bold ${changeColor}`}>{fmtPct(f.change)}</span>
              <span className="w-10 text-right font-bold" style={{ color: mfiColor(f.mfi) }}>{Math.round(f.mfi)}</span>
              <span className="w-16 text-right font-bold" style={{ color: flowColor(f.netFlow5d) }}>
                {fmtFlowSigned(f.netFlow5d)}
              </span>
              <span className="w-12 text-right text-[6px] font-black" style={{ color: badge.color }}>{badge.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Panel ──

export function MoneyFlowPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMoneyFlow();
  const [tab, setTab] = useState<Tab>('overview');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: tr(t, 'mfTabOverview', 'Overview') },
    { key: 'sectors', label: tr(t, 'mfTabSectors', 'Sectors') },
    { key: 'fixed_income', label: tr(t, 'mfTabBonds', 'Fixed Income') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <path d="M2 14V2h2v5l3-3 3 3V2h2v12" fill="none" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'mfTitle', 'Money Flow')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral/20">
              {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-emerald-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0">
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-1 text-[8px] font-black font-mono uppercase tracking-wider transition-colors ${
              tab === tb.key
                ? 'text-emerald-400 border-b border-emerald-400'
                : 'text-neutral/30 hover:text-neutral/60'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        ) : data ? (
          <>
            {tab === 'overview' && <OverviewTab flows={data.flows} />}
            {tab === 'sectors' && <SectorsTab flows={data.flows} />}
            {tab === 'fixed_income' && (
              <FixedIncomeTab
                flows={data.flows.filter(f => f.category === 'fixed_income')}
                allFlows={data.flows}
              />
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] font-mono text-neutral/40 uppercase">
            {tr(t, 'mfNoData', 'No data available')}
          </div>
        )}
      </div>
    </div>
  );
}
