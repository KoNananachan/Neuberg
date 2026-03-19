import { useState } from 'react';
import { useEndowment } from '../../api/hooks/use-endowment';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const EMERALD = '#34d399';
const EMERALD_DIM = 'rgba(52,211,153,0.12)';

type ViewTab = 'OVERVIEW' | 'ALLOCATION' | 'PERFORMANCE' | 'ACTIVITY';

// ── Formatting helpers ──

function fmtB(n: number): string {
  return '$' + n.toFixed(1) + 'B';
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(2) + '%';
}

function fmtPctPlain(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bp';
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

// ── Color helpers ──

function returnColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

function riskColor(label: string): string {
  const l = label.toUpperCase();
  if (l === 'LOW') return 'text-emerald-400';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'text-yellow-400';
  if (l === 'HIGH' || l === 'ELEVATED') return 'text-orange-400';
  if (l === 'VERY HIGH' || l === 'EXTREME') return 'text-red-400';
  return 'text-neutral-400';
}

function riskBg(label: string): string {
  const l = label.toUpperCase();
  if (l === 'LOW') return 'bg-emerald-400/10';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'bg-yellow-400/10';
  if (l === 'HIGH' || l === 'ELEVATED') return 'bg-orange-400/10';
  if (l === 'VERY HIGH' || l === 'EXTREME') return 'bg-red-400/10';
  return 'bg-neutral-400/10';
}

function activityColor(type: string): string {
  const t = type.toUpperCase();
  if (t === 'INCREASE' || t === 'BUY' || t === 'ADD') return 'text-emerald-400';
  if (t === 'DECREASE' || t === 'SELL' || t === 'REDUCE') return 'text-red-400';
  if (t === 'REBALANCE' || t === 'SHIFT') return 'text-cyan-400';
  return 'text-neutral-400';
}

function activityBg(type: string): string {
  const t = type.toUpperCase();
  if (t === 'INCREASE' || t === 'BUY' || t === 'ADD') return 'bg-emerald-400/10';
  if (t === 'DECREASE' || t === 'SELL' || t === 'REDUCE') return 'bg-red-400/10';
  if (t === 'REBALANCE' || t === 'SHIFT') return 'bg-cyan-400/10';
  return 'bg-neutral-400/10';
}

// ── Main Panel ──

export function EndowmentPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEndowment();
  const [view, setView] = useState<ViewTab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="3" y="8" width="10" height="6" stroke={EMERALD} strokeWidth="0.8" fill="none" />
            <path d="M4 8 L8 4 L12 8" stroke={EMERALD} strokeWidth="0.8" fill="none" strokeLinejoin="round" />
            <rect x="6" y="10" width="4" height="4" stroke={EMERALD} strokeWidth="0.6" fill="none" />
            <line x1="8" y1="10" x2="8" y2="14" stroke={EMERALD} strokeWidth="0.4" />
            <line x1="6" y1="12" x2="10" y2="12" stroke={EMERALD} strokeWidth="0.4" />
            <circle cx="8" cy="6" r="0.8" fill={EMERALD} opacity="0.6" />
            <rect x="1" y="14" width="14" height="1" fill={EMERALD} opacity="0.3" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: EMERALD }}>
            {tr(t, 'endowmentTitle', 'Endowment Model Portfolio')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['OVERVIEW', 'ALLOCATION', 'PERFORMANCE', 'ACTIVITY'] as ViewTab[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="text-[7px] font-bold uppercase px-1.5 py-0.5 transition-colors"
              style={{
                background: view === v ? EMERALD_DIM : 'transparent',
                color: view === v ? EMERALD : '#737373',
              }}
            >
              {v}
            </button>
          ))}
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors ml-1">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'endowmentNoData', 'No data available')}
          </div>
        )}

        {data && view === 'OVERVIEW' && <OverviewView data={data} />}
        {data && view === 'ALLOCATION' && <AllocationView data={data} />}
        {data && view === 'PERFORMANCE' && <PerformanceView data={data} />}
        {data && view === 'ACTIVITY' && <ActivityView data={data} />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── OVERVIEW VIEW
// ══════════════════════════════════════════════════════════════

function OverviewView({ data }: { data: any }) {
  const t = useT();
  const summary = data?.summary;
  const endowments: any[] = data?.endowments ?? [];
  const riskMetrics: any[] = data?.riskMetrics ?? [];

  return (
    <div className="text-[9px]">
      {/* Summary Cards */}
      {summary && (
        <div className="flex gap-0 border-b border-border/20">
          <div className="flex-1 px-2 py-1.5 border-r border-white/[0.06] bg-white/[0.01]">
            <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
              {tr(t, 'endowTotalAum', 'Total Endowment AUM')}
            </div>
            <div className="text-[10px] font-bold" style={{ color: EMERALD }}>
              {summary?.totalAum != null ? fmtB(summary.totalAum) : '--'}
            </div>
          </div>
          <div className="flex-1 px-2 py-1.5 border-r border-white/[0.06] bg-white/[0.01]">
            <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
              {tr(t, 'endowAvgReturn1Y', 'Avg 1Y Return')}
            </div>
            <div className={`text-[10px] font-bold ${returnColor(summary?.avgReturn1y ?? 0)}`}>
              {summary?.avgReturn1y != null ? fmtPct(summary.avgReturn1y) : '--'}
            </div>
          </div>
          <div className="flex-1 px-2 py-1.5 border-r border-white/[0.06] bg-white/[0.01]">
            <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
              {tr(t, 'endowAvgPayout', 'Avg Payout Rate')}
            </div>
            <div className="text-[10px] font-bold text-white">
              {summary?.avgPayoutRate != null ? fmtPctPlain(summary.avgPayoutRate) : '--'}
            </div>
          </div>
          <div className="flex-1 px-2 py-1.5 bg-white/[0.01]">
            <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
              {tr(t, 'endowCount', 'Endowments Tracked')}
            </div>
            <div className="text-[10px] font-bold" style={{ color: EMERALD }}>
              {summary?.count ?? '--'}
            </div>
          </div>
        </div>
      )}

      {/* Endowment Ranking Table */}
      {endowments.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowRankings', 'Endowment Rankings')}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[24px_1fr_56px_48px_48px_48px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">#</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Name</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">AUM ($B)</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">5Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">10Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-2">Payout</span>
          </div>

          {/* Rows */}
          {endowments.map((e: any, i: number) => (
            <div
              key={`${e?.name ?? i}-${i}`}
              className="grid grid-cols-[24px_1fr_56px_48px_48px_48px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] text-neutral-600">{e?.rank ?? i + 1}</span>
              <span className="text-[8px] font-bold truncate" style={{ color: EMERALD }}>
                {e?.name ?? '--'}
              </span>
              <span className="text-[8px] font-bold text-white text-right">
                {e?.aum != null ? e.aum.toFixed(1) : '--'}
              </span>
              <span className={`text-[8px] font-bold text-right ${returnColor(e?.return1y ?? 0)}`}>
                {e?.return1y != null ? fmtPct(e.return1y) : '--'}
              </span>
              <span className={`text-[8px] text-right ${returnColor(e?.return5y ?? 0)}`}>
                {e?.return5y != null ? fmtPct(e.return5y) : '--'}
              </span>
              <span className={`text-[8px] text-right ${returnColor(e?.return10y ?? 0)}`}>
                {e?.return10y != null ? fmtPct(e.return10y) : '--'}
              </span>
              <span className="text-[8px] text-neutral-400 text-right pr-2">
                {e?.payoutRate != null ? fmtPctPlain(e.payoutRate) : '--'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Risk Metrics Summary Cards */}
      {riskMetrics.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowRiskMetrics', 'Risk Metrics Summary')}
            </span>
          </div>
          <div className="px-2 py-2 grid grid-cols-3 gap-1.5">
            {riskMetrics.map((m: any, i: number) => (
              <div key={`${m?.label ?? i}-${i}`} className="px-2 py-1.5 border border-border/20 bg-white/[0.01]">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  {m?.label ?? '--'}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold text-white">
                    {m?.value ?? '--'}
                  </span>
                  {m?.riskLevel && (
                    <span className={`px-1 py-0.5 text-[5px] font-bold uppercase tracking-wider ${riskColor(m.riskLevel)} ${riskBg(m.riskLevel)}`}>
                      {m.riskLevel}
                    </span>
                  )}
                </div>
                {m?.change != null && (
                  <span className={`text-[7px] ${returnColor(m.change)}`}>
                    {trendArrow(m.change)} {fmtPct(m.change)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── ALLOCATION VIEW
// ══════════════════════════════════════════════════════════════

const ALLOC_COLORS: { key: string; color: string; label: string }[] = [
  { key: 'equity', color: '#60a5fa', label: 'Equity' },
  { key: 'fixedIncome', color: '#34d399', label: 'Fixed Income' },
  { key: 'alternatives', color: '#a78bfa', label: 'Alternatives' },
  { key: 'realAssets', color: '#fb923c', label: 'Real Assets' },
  { key: 'cash', color: '#94a3b8', label: 'Cash' },
];

function AllocationView({ data }: { data: any }) {
  const t = useT();
  const allocations: any[] = data?.allocations ?? [];
  const allocationTrends: any[] = data?.allocationTrends ?? [];
  const topManagers: any[] = data?.topManagers ?? [];

  return (
    <div className="text-[9px]">
      {/* Allocation Breakdown per Endowment */}
      {allocations.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowAllocBreakdown', 'Allocation Breakdown')}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_40px_40px_40px_40px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Endowment</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Equity</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">FI</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Alts</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Real</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-2">Cash</span>
          </div>

          {allocations.map((a: any, i: number) => (
            <div key={`${a?.name ?? i}-${i}`}>
              <div className="grid grid-cols-[1fr_40px_40px_40px_40px_40px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center">
                <span className="text-[8px] font-bold truncate" style={{ color: EMERALD }}>
                  {a?.name ?? '--'}
                </span>
                <span className="text-[8px] text-white text-right">
                  {a?.equity != null ? fmtPctPlain(a.equity) : '--'}
                </span>
                <span className="text-[8px] text-neutral-300 text-right">
                  {a?.fixedIncome != null ? fmtPctPlain(a.fixedIncome) : '--'}
                </span>
                <span className="text-[8px] text-neutral-300 text-right">
                  {a?.alternatives != null ? fmtPctPlain(a.alternatives) : '--'}
                </span>
                <span className="text-[8px] text-neutral-300 text-right">
                  {a?.realAssets != null ? fmtPctPlain(a.realAssets) : '--'}
                </span>
                <span className="text-[8px] text-neutral-500 text-right pr-2">
                  {a?.cash != null ? fmtPctPlain(a.cash) : '--'}
                </span>
              </div>
              {/* Stacked bar */}
              <div className="px-2 pb-1">
                <div className="h-1.5 w-full flex overflow-hidden bg-white/[0.03]">
                  {ALLOC_COLORS.map(({ key, color }) => {
                    const pct = a?.[key] ?? 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={key}
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.65 }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center gap-2 px-2 py-1 border-t border-border/5">
            {ALLOC_COLORS.map(({ color, label }) => (
              <div key={label} className="flex items-center gap-0.5">
                <div className="w-1.5 h-1.5" style={{ backgroundColor: color, opacity: 0.65 }} />
                <span className="text-[6px] text-white/25">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Allocation Trends: Current vs 5Y Ago vs 10Y Ago */}
      {allocationTrends.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowAllocTrends', 'Asset Allocation Trends')}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_44px_44px_44px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Asset Class</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Current</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">5Y Ago</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-2">10Y Ago</span>
          </div>

          {allocationTrends.map((trend: any, i: number) => {
            const diff = (trend?.current ?? 0) - (trend?.fiveYearAgo ?? 0);
            return (
              <div
                key={`${trend?.assetClass ?? i}-${i}`}
                className="grid grid-cols-[1fr_44px_44px_44px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
              >
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-bold text-white">
                    {trend?.assetClass ?? '--'}
                  </span>
                  <span className={`text-[7px] ${returnColor(diff)}`}>
                    {trendArrow(diff)}
                  </span>
                </div>
                <span className="text-[8px] font-bold text-right" style={{ color: EMERALD }}>
                  {trend?.current != null ? fmtPctPlain(trend.current) : '--'}
                </span>
                <span className="text-[8px] text-neutral-400 text-right">
                  {trend?.fiveYearAgo != null ? fmtPctPlain(trend.fiveYearAgo) : '--'}
                </span>
                <span className="text-[8px] text-neutral-500 text-right pr-2">
                  {trend?.tenYearAgo != null ? fmtPctPlain(trend.tenYearAgo) : '--'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Manager Allocations */}
      {topManagers.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowTopManagers', 'Top Manager Allocations')}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[24px_1fr_64px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">#</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Manager</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Strategy</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">AUM ($B)</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-2">Mandates</span>
          </div>

          {topManagers.map((mgr: any, i: number) => (
            <div
              key={`${mgr?.name ?? i}-${i}`}
              className="grid grid-cols-[24px_1fr_64px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] text-neutral-600">{mgr?.rank ?? i + 1}</span>
              <span className="text-[8px] font-bold truncate" style={{ color: EMERALD }}>
                {mgr?.name ?? '--'}
              </span>
              <span className="text-[7px] text-neutral-500 truncate">
                {mgr?.strategy ?? '--'}
              </span>
              <span className="text-[8px] font-bold text-white text-right">
                {mgr?.aum != null ? mgr.aum.toFixed(1) : '--'}
              </span>
              <span className="text-[8px] text-neutral-400 text-right pr-2">
                {mgr?.mandates ?? '--'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── PERFORMANCE VIEW
// ══════════════════════════════════════════════════════════════

function PerformanceView({ data }: { data: any }) {
  const t = useT();
  const benchmarks: any[] = data?.benchmarks ?? [];
  const performanceMetrics: any[] = data?.performanceMetrics ?? [];

  return (
    <div className="text-[9px]">
      {/* Benchmarks Comparison */}
      {benchmarks.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowBenchmarks', 'Benchmark Comparison')}
            </span>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Benchmark</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">3Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">5Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">10Y</span>
            <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-2">20Y</span>
          </div>

          {benchmarks.map((b: any, i: number) => {
            const isEndowment = (b?.name ?? '').toLowerCase().includes('endowment');
            return (
              <div
                key={`${b?.name ?? i}-${i}`}
                className={`grid grid-cols-[1fr_48px_48px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center ${
                  isEndowment ? 'bg-emerald-400/[0.04]' : ''
                }`}
              >
                <span className={`text-[8px] font-bold truncate ${isEndowment ? '' : 'text-white/70'}`} style={isEndowment ? { color: EMERALD } : undefined}>
                  {b?.name ?? '--'}
                </span>
                <span className={`text-[8px] font-bold text-right ${returnColor(b?.return1y ?? 0)}`}>
                  {b?.return1y != null ? fmtPct(b.return1y) : '--'}
                </span>
                <span className={`text-[8px] text-right ${returnColor(b?.return3y ?? 0)}`}>
                  {b?.return3y != null ? fmtPct(b.return3y) : '--'}
                </span>
                <span className={`text-[8px] text-right ${returnColor(b?.return5y ?? 0)}`}>
                  {b?.return5y != null ? fmtPct(b.return5y) : '--'}
                </span>
                <span className={`text-[8px] text-right ${returnColor(b?.return10y ?? 0)}`}>
                  {b?.return10y != null ? fmtPct(b.return10y) : '--'}
                </span>
                <span className={`text-[8px] text-right pr-2 ${returnColor(b?.return20y ?? 0)}`}>
                  {b?.return20y != null ? fmtPct(b.return20y) : '--'}
                </span>
              </div>
            );
          })}

          {/* Labels for benchmark types */}
          <div className="px-2 py-1 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5" style={{ backgroundColor: EMERALD, opacity: 0.6 }} />
              <span className="text-[6px] text-white/25">Endowment Avg</span>
            </div>
            <span className="text-[6px] text-white/15">vs S&P 500, 60/40, HFRI, PE Index</span>
          </div>
        </div>
      )}

      {/* Performance Metrics Grid */}
      {performanceMetrics.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowPerfMetrics', 'Performance Metrics')}
            </span>
          </div>

          <div className="px-2 py-2 grid grid-cols-3 gap-1.5">
            {performanceMetrics.map((m: any, i: number) => (
              <div key={`${m?.label ?? i}-${i}`} className="px-2 py-1.5 border border-border/20 bg-white/[0.01]">
                <div className="text-[7px] text-white/30 uppercase tracking-wider mb-0.5">
                  {m?.label ?? '--'}
                </div>
                <div className="text-[10px] font-bold text-white">
                  {m?.value ?? '--'}
                </div>
                {m?.benchmark != null && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[6px] text-white/20 uppercase">vs BM:</span>
                    <span className={`text-[7px] font-bold ${returnColor(m?.spread ?? 0)}`}>
                      {m?.spread != null ? fmtBps(m.spread) : '--'}
                    </span>
                  </div>
                )}
                {m?.percentile != null && (
                  <div className="mt-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[6px] text-white/20 uppercase">Percentile</span>
                      <span className="text-[7px] font-bold" style={{ color: EMERALD }}>
                        {m.percentile}th
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.04] mt-0.5">
                      <div
                        className="h-full"
                        style={{
                          width: `${Math.min(m.percentile, 100)}%`,
                          backgroundColor: EMERALD,
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ── ACTIVITY VIEW
// ══════════════════════════════════════════════════════════════

function ActivityView({ data }: { data: any }) {
  const t = useT();
  const activities: any[] = data?.recentActivity ?? [];
  const themes: any[] = data?.investmentThemes ?? [];

  return (
    <div className="text-[9px]">
      {/* Recent Activity Feed */}
      {activities.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowRecentActivity', 'Recent Activity')}
            </span>
          </div>

          {activities.map((act: any, i: number) => (
            <div
              key={`${act?.endowment ?? i}-${act?.date ?? i}-${i}`}
              className="px-2 py-[4px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-bold shrink-0" style={{ color: EMERALD }}>
                  {act?.endowment ?? '--'}
                </span>
                <span className={`px-1 py-0.5 text-[5px] font-bold uppercase tracking-wider shrink-0 ${activityColor(act?.type ?? '')} ${activityBg(act?.type ?? '')}`}>
                  {act?.type ?? '--'}
                </span>
                <span className="text-[7px] text-neutral-600 shrink-0">
                  {act?.date ?? '--'}
                </span>
              </div>
              <div className="mt-0.5 flex items-start gap-2">
                <span className="text-[8px] text-neutral-300 flex-1">
                  {act?.description ?? '--'}
                </span>
                {act?.sizeM != null && (
                  <span className="text-[7px] font-bold text-white shrink-0">
                    ${act.sizeM.toFixed(0)}M
                  </span>
                )}
              </div>
              {act?.asset && (
                <div className="mt-0.5 flex items-center gap-1">
                  <span className="text-[6px] text-white/20 uppercase">Asset:</span>
                  <span className="text-[7px] text-neutral-400">{act.asset}</span>
                  {act?.sector && (
                    <>
                      <span className="text-[6px] text-white/10">|</span>
                      <span className="text-[7px] text-neutral-500">{act.sector}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Investment Themes */}
      {themes.length > 0 && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black uppercase tracking-wider text-neutral-500">
              {tr(t, 'endowThemes', 'Investment Themes')}
            </span>
          </div>

          {themes.map((theme: any, i: number) => {
            const conviction = (theme?.conviction ?? '').toUpperCase();
            const convColor = conviction === 'HIGH' ? 'text-emerald-400' : conviction === 'LOW' ? 'text-red-400' : 'text-yellow-400';
            const convBg = conviction === 'HIGH' ? 'bg-emerald-400/10' : conviction === 'LOW' ? 'bg-red-400/10' : 'bg-yellow-400/10';

            return (
              <div
                key={`${theme?.name ?? i}-${i}`}
                className="px-2 py-[4px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-white">
                      {theme?.name ?? '--'}
                    </span>
                    {theme?.conviction && (
                      <span className={`px-1 py-0.5 text-[5px] font-bold uppercase tracking-wider ${convColor} ${convBg}`}>
                        {conviction}
                      </span>
                    )}
                  </div>
                  {theme?.adoptionRate != null && (
                    <div className="flex items-center gap-1">
                      <span className="text-[6px] text-white/20 uppercase">Adoption</span>
                      <span className="text-[8px] font-bold" style={{ color: EMERALD }}>
                        {fmtPctPlain(theme.adoptionRate)}
                      </span>
                    </div>
                  )}
                </div>
                {theme?.description && (
                  <div className="mt-0.5 text-[7px] text-neutral-500">
                    {theme.description}
                  </div>
                )}
                {theme?.topEndowments && theme.topEndowments.length > 0 && (
                  <div className="mt-0.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[6px] text-white/20 uppercase">Key:</span>
                    {theme.topEndowments.map((name: string, j: number) => (
                      <span key={`${name}-${j}`} className="text-[6px] px-1 py-0.5 bg-emerald-400/5 text-emerald-400/60">
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty states */}
      {activities.length === 0 && themes.length === 0 && (
        <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
          {tr(t, 'endowNoActivity', 'No recent activity')}
        </div>
      )}
    </div>
  );
}
