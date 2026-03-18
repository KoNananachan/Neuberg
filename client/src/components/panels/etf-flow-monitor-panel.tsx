import { useState } from 'react';
import { useEtfFlowMonitor } from '../../api/hooks/use-etf-flow-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Tabs ──

type Tab = 'inflows' | 'outflows' | 'categories' | 'creations' | 'rotation';

const TABS: { key: Tab; label: string }[] = [
  { key: 'inflows', label: 'INFLOWS' },
  { key: 'outflows', label: 'OUTFLOWS' },
  { key: 'categories', label: 'CATEGORIES' },
  { key: 'creations', label: 'CREATIONS' },
  { key: 'rotation', label: 'ROTATION' },
];

// ── Formatting ──

function fmtAum(n: number): string {
  if (Math.abs(n) >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  return '$' + n.toFixed(0);
}

function fmtFlow(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(0) + 'K';
  return sign + '$' + abs.toFixed(0);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function fmtUnits(n: number): string {
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

// ── Color ──

const GREEN = '#4ade80';
const RED = '#f87171';
const AMBER = '#fbbf24';
const BLUE = '#60a5fa';
const DIM = 'rgba(255,255,255,0.3)';

function flowColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return DIM;
}

// ── Horizontal Bar ──

function HBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(Math.abs(value) / max * 100, 100) : 0;
  return (
    <div className="w-full h-1 bg-white/[0.04] overflow-hidden">
      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.6 }} />
    </div>
  );
}

// ── Inflows Tab ──

function InflowsTab({ data }: { data: any }) {
  const items = (data?.inflows ?? []).slice(0, 10);
  const maxFlow = Math.max(...items.map((d: any) => Math.abs(d.dailyFlow ?? 0)), 1);

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="w-28 shrink-0">NAME</span>
        <span className="w-16 text-right shrink-0">AUM</span>
        <span className="w-16 text-right shrink-0">DAILY</span>
        <span className="w-16 text-right shrink-0">WEEKLY</span>
        <span className="w-16 text-right shrink-0">MONTHLY</span>
        <span className="w-14 text-right shrink-0">% AUM</span>
      </div>
      {items.map((item: any, i: number) => (
        <div
          key={item.ticker ?? i}
          className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-white/80">{item.ticker}</span>
          <span className="w-28 shrink-0 text-[8px] font-mono text-white/30 truncate">{item.name}</span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono text-white/50">{fmtAum(item.aum ?? 0)}</span>
          <span className="w-16 text-right shrink-0 text-[9px] font-mono font-bold" style={{ color: GREEN }}>
            {fmtFlow(item.dailyFlow ?? 0)}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: GREEN }}>
            {fmtFlow(item.weeklyFlow ?? 0)}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: GREEN }}>
            {fmtFlow(item.monthlyFlow ?? 0)}
          </span>
          <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/40">
            {fmtPct(item.flowPctAum ?? 0)}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO INFLOW DATA
        </div>
      )}
    </div>
  );
}

// ── Outflows Tab ──

function OutflowsTab({ data }: { data: any }) {
  const items = (data?.outflows ?? []).slice(0, 10);

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="w-28 shrink-0">NAME</span>
        <span className="w-16 text-right shrink-0">AUM</span>
        <span className="w-16 text-right shrink-0">DAILY</span>
        <span className="w-16 text-right shrink-0">WEEKLY</span>
        <span className="w-16 text-right shrink-0">MONTHLY</span>
        <span className="w-14 text-right shrink-0">% AUM</span>
      </div>
      {items.map((item: any, i: number) => (
        <div
          key={item.ticker ?? i}
          className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
        >
          <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-white/80">{item.ticker}</span>
          <span className="w-28 shrink-0 text-[8px] font-mono text-white/30 truncate">{item.name}</span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono text-white/50">{fmtAum(item.aum ?? 0)}</span>
          <span className="w-16 text-right shrink-0 text-[9px] font-mono font-bold" style={{ color: RED }}>
            {fmtFlow(item.dailyFlow ?? 0)}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: RED }}>
            {fmtFlow(item.weeklyFlow ?? 0)}
          </span>
          <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: RED }}>
            {fmtFlow(item.monthlyFlow ?? 0)}
          </span>
          <span className="w-14 text-right shrink-0 text-[8px] font-mono text-white/40">
            {fmtPct(item.flowPctAum ?? 0)}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO OUTFLOW DATA
        </div>
      )}
    </div>
  );
}

// ── Categories Tab ──

function CategoriesTab({ data }: { data: any }) {
  const categories = (data?.categories ?? []).slice(0, 12);
  const maxAbsDaily = Math.max(...categories.map((c: any) => Math.abs(c.dailyFlow ?? 0)), 1);
  const maxAbsWeekly = Math.max(...categories.map((c: any) => Math.abs(c.weeklyFlow ?? 0)), 1);
  const maxAbsMonthly = Math.max(...categories.map((c: any) => Math.abs(c.monthlyFlow ?? 0)), 1);

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-28 shrink-0">CATEGORY</span>
        <span className="w-16 text-right shrink-0">DAILY</span>
        <span className="w-20 shrink-0 pl-1">BAR</span>
        <span className="w-16 text-right shrink-0">WEEKLY</span>
        <span className="w-20 shrink-0 pl-1">BAR</span>
        <span className="w-16 text-right shrink-0">MONTHLY</span>
        <span className="w-20 shrink-0 pl-1">BAR</span>
        <span className="w-16 text-right shrink-0">NET CR/RD</span>
      </div>
      {categories.map((cat: any, i: number) => {
        const dColor = flowColor(cat.dailyFlow ?? 0);
        const wColor = flowColor(cat.weeklyFlow ?? 0);
        const mColor = flowColor(cat.monthlyFlow ?? 0);
        return (
          <div
            key={cat.name ?? i}
            className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="w-28 shrink-0 text-[8px] font-mono font-bold text-white/70 truncate">{cat.name}</span>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono font-bold" style={{ color: dColor }}>
              {fmtFlow(cat.dailyFlow ?? 0)}
            </span>
            <div className="w-20 shrink-0 pl-1 flex items-center">
              <HBar value={cat.dailyFlow ?? 0} max={maxAbsDaily} color={dColor} />
            </div>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: wColor }}>
              {fmtFlow(cat.weeklyFlow ?? 0)}
            </span>
            <div className="w-20 shrink-0 pl-1 flex items-center">
              <HBar value={cat.weeklyFlow ?? 0} max={maxAbsWeekly} color={wColor} />
            </div>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: mColor }}>
              {fmtFlow(cat.monthlyFlow ?? 0)}
            </span>
            <div className="w-20 shrink-0 pl-1 flex items-center">
              <HBar value={cat.monthlyFlow ?? 0} max={maxAbsMonthly} color={mColor} />
            </div>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono" style={{ color: flowColor(cat.netCreations ?? 0) }}>
              {fmtFlow(cat.netCreations ?? 0)}
            </span>
          </div>
        );
      })}
      {categories.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO CATEGORY DATA
        </div>
      )}
    </div>
  );
}

// ── Creations Tab ──

function CreationsTab({ data }: { data: any }) {
  const items = (data?.creations ?? []);

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-12 shrink-0">TICKER</span>
        <span className="w-18 text-right shrink-0">CREATION</span>
        <span className="w-18 text-right shrink-0">REDEMPTION</span>
        <span className="w-16 text-right shrink-0">NET</span>
        <span className="w-18 text-right shrink-0">IMPLIED</span>
        <span className="w-16 text-right shrink-0">PREM/DISC</span>
      </div>
      {items.map((item: any, i: number) => {
        const net = (item.creationUnits ?? 0) - (item.redemptionUnits ?? 0);
        const premColor = (item.premiumDiscount ?? 0) >= 0 ? GREEN : RED;
        return (
          <div
            key={item.ticker ?? i}
            className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="w-12 shrink-0 text-[9px] font-mono font-bold text-white/80">{item.ticker}</span>
            <span className="w-18 text-right shrink-0 text-[8px] font-mono text-white/50">
              {fmtUnits(item.creationUnits ?? 0)}
            </span>
            <span className="w-18 text-right shrink-0 text-[8px] font-mono text-white/50">
              {fmtUnits(item.redemptionUnits ?? 0)}
            </span>
            <span className="w-16 text-right shrink-0 text-[9px] font-mono font-bold" style={{ color: flowColor(net) }}>
              {net >= 0 ? '+' : ''}{fmtUnits(net)}
            </span>
            <span className="w-18 text-right shrink-0 text-[8px] font-mono" style={{ color: flowColor(item.impliedFlow ?? 0) }}>
              {fmtFlow(item.impliedFlow ?? 0)}
            </span>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono font-bold" style={{ color: premColor }}>
              {fmtPct(item.premiumDiscount ?? 0)}
            </span>
          </div>
        );
      })}
      {items.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO CREATION/REDEMPTION DATA
        </div>
      )}
    </div>
  );
}

// ── Rotation Tab ──

function momentumBadge(momentum: string): { text: string; color: string; bg: string } {
  switch (momentum) {
    case 'accelerating': return { text: 'ACCEL', color: GREEN, bg: 'rgba(74,222,128,0.1)' };
    case 'decelerating': return { text: 'DECEL', color: RED, bg: 'rgba(248,113,113,0.1)' };
    case 'stable': return { text: 'STABLE', color: AMBER, bg: 'rgba(251,191,36,0.08)' };
    default: return { text: String(momentum).toUpperCase(), color: DIM, bg: 'rgba(255,255,255,0.03)' };
  }
}

function rotationSignalBadge(signal: string): { text: string; color: string; bg: string } {
  switch (signal) {
    case 'inflow': return { text: 'INFLOW', color: GREEN, bg: 'rgba(74,222,128,0.1)' };
    case 'outflow': return { text: 'OUTFLOW', color: RED, bg: 'rgba(248,113,113,0.1)' };
    case 'neutral': return { text: 'NEUTRAL', color: AMBER, bg: 'rgba(251,191,36,0.08)' };
    case 'rotation_in': return { text: 'ROT IN', color: BLUE, bg: 'rgba(96,165,250,0.1)' };
    case 'rotation_out': return { text: 'ROT OUT', color: '#c084fc', bg: 'rgba(192,132,252,0.1)' };
    default: return { text: String(signal).toUpperCase(), color: DIM, bg: 'rgba(255,255,255,0.03)' };
  }
}

function RotationTab({ data }: { data: any }) {
  const sectors = (data?.rotation ?? []).slice(0, 11);
  const maxAbsWeekly = Math.max(...sectors.map((s: any) => Math.abs(s.weeklyFlow ?? 0)), 1);
  const maxAbsMonthly = Math.max(...sectors.map((s: any) => Math.abs(s.monthlyFlow ?? 0)), 1);

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="flex items-center px-2 py-1 border-b border-border/20 text-[7px] font-black uppercase tracking-wider text-white/25">
        <span className="w-24 shrink-0">SECTOR</span>
        <span className="w-16 shrink-0 text-center">MOMENTUM</span>
        <span className="w-16 shrink-0 text-center">SIGNAL</span>
        <span className="w-16 text-right shrink-0">WEEKLY</span>
        <span className="w-20 shrink-0 pl-1">BAR</span>
        <span className="w-16 text-right shrink-0">MONTHLY</span>
        <span className="w-20 shrink-0 pl-1">BAR</span>
      </div>
      {sectors.map((sector: any, i: number) => {
        const mom = momentumBadge(sector.momentum ?? 'stable');
        const sig = rotationSignalBadge(sector.rotationSignal ?? 'neutral');
        const wColor = flowColor(sector.weeklyFlow ?? 0);
        const mColor = flowColor(sector.monthlyFlow ?? 0);
        return (
          <div
            key={sector.name ?? i}
            className="flex items-center px-2 py-1 border-b border-border/20 hover:bg-green-400/[0.02] transition-colors"
          >
            <span className="w-24 shrink-0 text-[8px] font-mono font-bold text-white/70 truncate">{sector.name}</span>
            <span className="w-16 shrink-0 flex justify-center">
              <span
                className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5"
                style={{ color: mom.color, backgroundColor: mom.bg }}
              >
                {mom.text}
              </span>
            </span>
            <span className="w-16 shrink-0 flex justify-center">
              <span
                className="text-[6px] font-black font-mono uppercase px-1.5 py-0.5"
                style={{ color: sig.color, backgroundColor: sig.bg }}
              >
                {sig.text}
              </span>
            </span>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono font-bold" style={{ color: wColor }}>
              {fmtFlow(sector.weeklyFlow ?? 0)}
            </span>
            <div className="w-20 shrink-0 pl-1 flex items-center">
              <HBar value={sector.weeklyFlow ?? 0} max={maxAbsWeekly} color={wColor} />
            </div>
            <span className="w-16 text-right shrink-0 text-[8px] font-mono font-bold" style={{ color: mColor }}>
              {fmtFlow(sector.monthlyFlow ?? 0)}
            </span>
            <div className="w-20 shrink-0 pl-1 flex items-center">
              <HBar value={sector.monthlyFlow ?? 0} max={maxAbsMonthly} color={mColor} />
            </div>
          </div>
        );
      })}
      {sectors.length === 0 && (
        <div className="text-center py-6 text-[9px] font-mono text-white/20 uppercase tracking-wider">
          NO ROTATION DATA
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function EtfFlowMonitorPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEtfFlowMonitor();
  const [activeTab, setActiveTab] = useState<Tab>('inflows');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <rect x="1" y="9" width="3" height="6" fill={GREEN} opacity="0.8" />
            <rect x="5" y="6" width="3" height="9" fill={GREEN} opacity="0.6" />
            <rect x="9" y="3" width="3" height="12" fill={GREEN} opacity="0.4" />
            <rect x="13" y="1" width="2" height="14" fill={GREEN} opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: GREEN }}>
            {tr(t, 'etfFlowMonitor', 'ETF Flow Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] text-white/20">
              {new Date(data.timestamp ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-white/30 hover:text-green-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0 overflow-x-auto">
        {TABS.map((tab: any) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 px-3 py-1.5 text-[7px] font-black uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overflow-x-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
                LOADING ETF FLOW DATA...
              </span>
            </div>
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] text-red-400 uppercase tracking-widest font-mono font-bold">
                FAILED TO LOAD ETF FLOW DATA
              </span>
              <button
                onClick={() => refetch()}
                className="text-[8px] font-mono uppercase tracking-wider text-white/40 hover:text-green-400 transition-colors px-3 py-1 border border-border/20"
              >
                RETRY
              </button>
            </div>
          </div>
        ) : data ? (
          <>
            {activeTab === 'inflows' && <InflowsTab data={data} />}
            {activeTab === 'outflows' && <OutflowsTab data={data} />}
            {activeTab === 'categories' && <CategoriesTab data={data} />}
            {activeTab === 'creations' && <CreationsTab data={data} />}
            {activeTab === 'rotation' && <RotationTab data={data} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase font-mono">
            NO DATA AVAILABLE
          </div>
        )}
      </div>
    </div>
  );
}
