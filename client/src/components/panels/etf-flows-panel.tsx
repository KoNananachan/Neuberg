import { useState } from 'react';
import { useEtfFlows } from '../../api/hooks/use-etf-flows';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#a78bfa';
const ACCENT_DIM = 'rgba(167,139,250,0.08)';
const GREEN = '#34d399';
const RED = '#f87171';

type Tab = 'top' | 'assetClass' | 'region' | 'sector';

const TABS: { key: Tab; label: string }[] = [
  { key: 'top', label: 'TOP FLOWS' },
  { key: 'assetClass', label: 'ASSET CLASS' },
  { key: 'region', label: 'REGION' },
  { key: 'sector', label: 'SECTOR' },
];

// ── Number formatting ──

function fmtFlowB(n: number): string {
  const prefix = n > 0 ? '+' : n < 0 ? '-' : '';
  return prefix + '$' + Math.abs(n).toFixed(1) + 'B';
}

function fmtFlowM(n: number): string {
  const prefix = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1000) return prefix + '$' + (abs / 1000).toFixed(1) + 'B';
  return prefix + '$' + abs.toFixed(0) + 'M';
}

function fmtAumB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtAumT(n: number): string {
  return '$' + n.toFixed(2) + 'T';
}

// ── Color helpers ──

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function momentumBadge(momentum: string): { text: string; color: string; bg: string } {
  switch (momentum) {
    case 'Accelerating':
      return { text: 'ACCELERATING', color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'Decelerating':
      return { text: 'DECELERATING', color: RED, bg: 'rgba(248,113,113,0.1)' };
    default:
      return { text: 'STEADY', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

function sectorMomentumBadge(momentum: string): { text: string; color: string; bg: string } {
  switch (momentum) {
    case 'Inflow':
      return { text: 'INFLOW', color: GREEN, bg: 'rgba(52,211,153,0.1)' };
    case 'Outflow':
      return { text: 'OUTFLOW', color: RED, bg: 'rgba(248,113,113,0.1)' };
    default:
      return { text: 'NEUTRAL', color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.03)' };
  }
}

// ── Summary Bar ──

function SummaryBar({ data }: { data: Record<string, unknown> }) {
  const summary = data?.summary as {
    flow1d?: number;
    flow1w?: number;
    flow1m?: number;
    topInflow?: string;
    topOutflow?: string;
    totalAum?: number;
  } | undefined;

  if (!summary) return null;

  const items = [
    { label: '1D FLOWS', value: fmtFlowB(summary.flow1d ?? 0), color: flowColor(summary.flow1d ?? 0) },
    { label: '1W FLOWS', value: fmtFlowB(summary.flow1w ?? 0), color: flowColor(summary.flow1w ?? 0) },
    { label: '1M FLOWS', value: fmtFlowB(summary.flow1m ?? 0), color: flowColor(summary.flow1m ?? 0) },
    { label: 'TOP INFLOW', value: summary.topInflow ?? '--', color: GREEN },
    { label: 'TOP OUTFLOW', value: summary.topOutflow ?? '--', color: RED },
    { label: 'TOTAL AUM', value: fmtAumT(summary.totalAum ?? 0), color: 'rgba(255,255,255,0.7)' },
  ];

  return (
    <div className="grid grid-cols-6 border-b border-white/[0.06] shrink-0">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 border-r border-white/[0.04] last:border-r-0">
          <div className="text-[7px] font-mono text-white/25 uppercase tracking-wider mb-0.5">
            {item.label}
          </div>
          <div className="text-[9px] font-mono font-bold" style={{ color: item.color }}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Top Flows Tab ──

function TopFlowsTable({ data }: { data: Record<string, unknown> }) {
  const topFlows = (data?.topFlows ?? []) as Array<{
    ticker: string;
    name: string;
    flow1d: number;
    flow1w: number;
    flow1m: number;
    aum: number;
    assetClass: string;
  }>;

  if (!topFlows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-white/25 uppercase tracking-widest">
        No flow data available
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center py-1 px-2 border-b border-border/10 bg-black/10 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="flex-1 min-w-0">NAME</span>
        <span className="w-16 text-right shrink-0">1D FLOW</span>
        <span className="w-16 text-right shrink-0">1W FLOW</span>
        <span className="w-16 text-right shrink-0">1M FLOW</span>
        <span className="w-14 text-right shrink-0">AUM ($B)</span>
        <span className="w-20 text-right shrink-0">ASSET CLASS</span>
      </div>
      {/* Rows */}
      {topFlows.map((row) => (
        <div
          key={row.ticker}
          className="flex items-center py-1 px-2 border-b border-border/5 hover:bg-white/[0.02] transition-colors text-[8px] font-mono"
        >
          <span className="w-12 shrink-0 font-bold" style={{ color: ACCENT }}>
            {row.ticker}
          </span>
          <span className="flex-1 min-w-0 text-white/40 truncate pr-2">
            {row.name}
          </span>
          <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1d) }}>
            {fmtFlowM(row.flow1d)}
          </span>
          <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1w) }}>
            {fmtFlowM(row.flow1w)}
          </span>
          <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1m) }}>
            {fmtFlowM(row.flow1m)}
          </span>
          <span className="w-14 text-right shrink-0 text-white/50">
            {fmtAumB(row.aum)}
          </span>
          <span className="w-20 text-right shrink-0 text-white/30">
            {row.assetClass}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Asset Class Tab ──

function AssetClassTable({ data }: { data: Record<string, unknown> }) {
  const assetClasses = (data?.assetClasses ?? []) as Array<{
    assetClass: string;
    flow1d: number;
    flow1w: number;
    flow1m: number;
    aum: number;
    momentum: string;
  }>;

  if (!assetClasses.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-white/25 uppercase tracking-widest">
        No asset class data available
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center py-1 px-2 border-b border-border/10 bg-black/10 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black">
        <span className="w-24 shrink-0">ASSET CLASS</span>
        <span className="w-16 text-right shrink-0">1D FLOW</span>
        <span className="w-16 text-right shrink-0">1W FLOW</span>
        <span className="w-16 text-right shrink-0">1M FLOW</span>
        <span className="w-14 text-right shrink-0">AUM ($B)</span>
        <span className="flex-1 text-right">MOMENTUM</span>
      </div>
      {/* Rows */}
      {assetClasses.map((row) => {
        const badge = momentumBadge(row.momentum);
        return (
          <div
            key={row.assetClass}
            className="flex items-center py-1 px-2 border-b border-border/5 hover:bg-white/[0.02] transition-colors text-[8px] font-mono"
          >
            <span className="w-24 shrink-0 font-bold" style={{ color: ACCENT }}>
              {row.assetClass}
            </span>
            <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1d) }}>
              {fmtFlowM(row.flow1d)}
            </span>
            <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1w) }}>
              {fmtFlowM(row.flow1w)}
            </span>
            <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1m) }}>
              {fmtFlowM(row.flow1m)}
            </span>
            <span className="w-14 text-right shrink-0 text-white/50">
              {fmtAumB(row.aum)}
            </span>
            <span className="flex-1 flex justify-end">
              <span
                className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Region Tab ──

function RegionTable({ data }: { data: Record<string, unknown> }) {
  const regions = (data?.regions ?? []) as Array<{
    region: string;
    flow1w: number;
    flow1m: number;
    aum: number;
    topEtf: string;
  }>;

  if (!regions.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-white/25 uppercase tracking-widest">
        No region data available
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center py-1 px-2 border-b border-border/10 bg-black/10 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black">
        <span className="w-24 shrink-0">REGION</span>
        <span className="w-16 text-right shrink-0">1W FLOW</span>
        <span className="w-16 text-right shrink-0">1M FLOW</span>
        <span className="w-14 text-right shrink-0">AUM ($B)</span>
        <span className="flex-1 text-right">TOP ETF</span>
      </div>
      {/* Rows */}
      {regions.map((row) => (
        <div
          key={row.region}
          className="flex items-center py-1 px-2 border-b border-border/5 hover:bg-white/[0.02] transition-colors text-[8px] font-mono"
        >
          <span className="w-24 shrink-0 font-bold" style={{ color: ACCENT }}>
            {row.region}
          </span>
          <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1w) }}>
            {fmtFlowM(row.flow1w)}
          </span>
          <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1m) }}>
            {fmtFlowM(row.flow1m)}
          </span>
          <span className="w-14 text-right shrink-0 text-white/50">
            {fmtAumB(row.aum)}
          </span>
          <span className="flex-1 text-right text-white/40">
            {row.topEtf}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Sector Tab ──

function SectorTable({ data }: { data: Record<string, unknown> }) {
  const sectors = (data?.sectors ?? []) as Array<{
    sector: string;
    flow1w: number;
    flow1m: number;
    topEtf: string;
    momentum: string;
  }>;

  if (!sectors.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-white/25 uppercase tracking-widest">
        No sector data available
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Header */}
      <div className="flex items-center py-1 px-2 border-b border-border/10 bg-black/10 text-[7px] font-mono text-white/25 uppercase tracking-wider sticky top-0 bg-black">
        <span className="w-24 shrink-0">SECTOR</span>
        <span className="w-16 text-right shrink-0">1W FLOW</span>
        <span className="w-16 text-right shrink-0">1M FLOW</span>
        <span className="flex-1">TOP ETF</span>
        <span className="w-20 text-right shrink-0">MOMENTUM</span>
      </div>
      {/* Rows */}
      {sectors.map((row) => {
        const badge = sectorMomentumBadge(row.momentum);
        return (
          <div
            key={row.sector}
            className="flex items-center py-1 px-2 border-b border-border/5 hover:bg-white/[0.02] transition-colors text-[8px] font-mono"
          >
            <span className="w-24 shrink-0 font-bold" style={{ color: ACCENT }}>
              {row.sector}
            </span>
            <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1w) }}>
              {fmtFlowM(row.flow1w)}
            </span>
            <span className="w-16 text-right shrink-0 font-bold" style={{ color: flowColor(row.flow1m) }}>
              {fmtFlowM(row.flow1m)}
            </span>
            <span className="flex-1 text-white/40 truncate">
              {row.topEtf}
            </span>
            <span className="w-20 flex justify-end shrink-0">
              <span
                className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5"
                style={{ color: badge.color, backgroundColor: badge.bg }}
              >
                {badge.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function EtfFlowsPanel() {
  const [tab, setTab] = useState<Tab>('top');
  const { data, isLoading, error, refetch } = useEtfFlows();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-white/[0.08] shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="2" y="10" width="3" height="4" fill={ACCENT} fillOpacity="0.7" />
            <rect x="6.5" y="6" width="3" height="8" fill={ACCENT} fillOpacity="0.5" />
            <rect x="11" y="2" width="3" height="12" fill={ACCENT} fillOpacity="0.9" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: ACCENT }}>
            ETF Fund Flows
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {data && (
            <span className="text-[6px] text-white/20">
              {new Date(data.timestamp as string ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-0.5 text-white/30 hover:text-violet-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-white/[0.06] bg-black/20 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              tab === t.key
                ? 'text-[#a78bfa]'
                : 'text-white/30 hover:text-white/60'
            }`}
            style={tab === t.key ? { backgroundColor: ACCENT_DIM } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary bar */}
      {data && <SummaryBar data={data as Record<string, unknown>} />}

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
            <span className="text-[10px] text-white/40 uppercase tracking-widest">
              Loading...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
            Failed to load ETF flows
          </span>
          <button
            onClick={() => refetch()}
            className="text-[9px] font-mono border border-white/10 px-2 py-0.5 text-white/40 hover:text-white hover:border-white/20 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          {tab === 'top' && <TopFlowsTable data={data as Record<string, unknown>} />}
          {tab === 'assetClass' && <AssetClassTable data={data as Record<string, unknown>} />}
          {tab === 'region' && <RegionTable data={data as Record<string, unknown>} />}
          {tab === 'sector' && <SectorTable data={data as Record<string, unknown>} />}
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[10px] text-white/40 uppercase">
          No data available
        </div>
      )}
    </div>
  );
}
