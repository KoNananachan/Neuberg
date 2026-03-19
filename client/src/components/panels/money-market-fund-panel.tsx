import { useState } from 'react';
import { useMoneyMarketFund } from '../../api/hooks/use-money-market-fund';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Tab definitions ──

type Tab = 'FUNDS' | 'FLOWS' | 'HOLDINGS' | 'YIELDS';
const TABS: Tab[] = ['FUNDS', 'FLOWS', 'HOLDINGS', 'YIELDS'];

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtRate3(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtBn(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}T`;
  return `$${n.toFixed(1)}B`;
}

function fmtBnSigned(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  if (Math.abs(n) >= 1000) return `${sign}${(n / 1000).toFixed(1)}T`;
  return `${sign}${n.toFixed(1)}B`;
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${n.toFixed(0)}d`;
}

function fmtNum(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function flowColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Skeleton shimmer ──

function Shimmer({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-3 py-2 space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-2 bg-neutral-800 flex-1" />
          <div className="h-2 bg-neutral-800 w-14" />
          <div className="h-2 bg-neutral-800 w-12" />
          <div className="h-2 bg-neutral-800 w-10" />
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function MoneyMarketFundPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMoneyMarketFund();
  const [activeTab, setActiveTab] = useState<Tab>('FUNDS');
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
            {tr(t, 'panelMoneyMarketFund', 'Money Market Fund Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.summary?.asOfDate ? (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {String(d.summary.asOfDate)}
            </span>
          ) : null}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {d?.summary ? (
        <div className="border-b border-border/20 bg-[#030303] shrink-0">
          <div className="flex items-center gap-0 divide-x divide-border/10">
            <div className="flex-1 px-3 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'mmfTotalAum', 'Total AUM')}
              </div>
              <div className="text-[13px] font-mono font-bold text-white mt-0.5">
                {fmtBn(d.summary.totalAum)}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'mmfNetFlows', 'Net Flows (Wk)')}
              </div>
              <div className={`text-[13px] font-mono font-bold mt-0.5 ${flowColor(d.summary.weeklyNetFlow)}`}>
                {fmtBnSigned(d.summary.weeklyNetFlow)}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'mmfAvgYield', 'Avg 7D Yield')}
              </div>
              <div className="text-[13px] font-mono font-bold text-indigo-400 mt-0.5">
                {fmtPct(d.summary.avg7dYield)}
              </div>
            </div>
            <div className="flex-1 px-3 py-1.5 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'mmfAvgWam', 'Avg WAM')}
              </div>
              <div className="text-[13px] font-mono font-bold text-neutral-300 mt-0.5">
                {fmtDays(d.summary.avgWam)}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tab navigation */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#030303]">
        <div className="flex gap-px px-2 py-1 flex-1 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-neutral-600 hover:text-neutral-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !d && <Shimmer rows={8} />}

        {/* Error state */}
        {error && !d && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
              FAILED TO LOAD MONEY MARKET FUND DATA
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-indigo-400 border border-indigo-400/30 hover:bg-indigo-400/10 transition-colors"
            >
              RETRY
            </button>
          </div>
        )}

        {/* Data views */}
        {d ? (
          <>
            {activeTab === 'FUNDS' && <FundsView d={d} t={t} />}
            {activeTab === 'FLOWS' && <FlowsView d={d} t={t} />}
            {activeTab === 'HOLDINGS' && <HoldingsView d={d} t={t} />}
            {activeTab === 'YIELDS' && <YieldsView d={d} t={t} />}
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── FUNDS View ──

function FundsView({ d, t }: { d: any; t: TFn }) {
  const funds = d?.funds ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400">
          {tr(t, 'mmfFundOverview', 'Fund Overview')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_50px_45px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmfFundName', 'Fund')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfAum', 'AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfNav', 'NAV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmf7dYield', '7D Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfWam', 'WAM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfWkFlow', 'Wk Flow')}
        </span>
      </div>

      {/* Fund rows */}
      {funds.map((f: any, i: number) => (
        <div
          key={f.name ? String(f.name) : i}
          className="grid grid-cols-[1fr_55px_55px_50px_45px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {f.type ? (
              <span className={`text-[6px] font-mono font-bold uppercase px-1 py-px shrink-0 ${
                String(f.type).toUpperCase() === 'GOVT'
                  ? 'text-blue-400 bg-blue-400/10'
                  : String(f.type).toUpperCase() === 'PRIME'
                    ? 'text-amber-400 bg-amber-400/10'
                    : 'text-emerald-400 bg-emerald-400/10'
              }`}>
                {String(f.type)}
              </span>
            ) : null}
            <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
              {f.name ? String(f.name) : '--'}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(f.aum)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {f.nav != null ? fmtRate(f.nav) : '--'}
          </span>
          <span className="text-[8px] font-mono text-indigo-400 text-right">
            {f.yield7d != null ? fmtPct(f.yield7d) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDays(f.wam)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(f.weeklyFlow)}`}>
            {fmtBnSigned(f.weeklyFlow)}
          </span>
        </div>
      ))}

      {funds.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Category breakdown */}
      {d?.summary?.byCategory && (d.summary.byCategory as any[]).length > 0 ? (
        <>
          <div className="px-3 py-1 border-b border-border/10 border-t border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'mmfByCategory', 'AUM by Category')}
            </span>
          </div>

          {(d.summary.byCategory as any[]).map((cat: any) => (
            <div
              key={cat.category ? String(cat.category) : String(cat.type)}
              className="flex items-center justify-between px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {cat.category ? String(cat.category) : String(cat.type)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-neutral-400">
                  {fmtBn(cat.aum)}
                </span>
                <div className="w-20 h-1.5 bg-neutral-800">
                  <div
                    className="h-full bg-indigo-400"
                    style={{ width: `${Math.min(cat.pct ?? cat.share ?? 0, 100)}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-indigo-400 w-10 text-right">
                  {fmtPct(cat.pct ?? cat.share)}
                </span>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

// ── FLOWS View ──

function FlowsView({ d, t }: { d: any; t: TFn }) {
  const flowData = d?.flowData ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400">
          {tr(t, 'mmfFlowAnalysis', 'Flow Analysis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmfPeriod', 'Period')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfInflows', 'Inflows')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfOutflows', 'Outflows')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfNetFlow', 'Net Flow')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfCumFlow', 'Cum Flow')}
        </span>
      </div>

      {/* Flow rows */}
      {flowData.map((row: any, i: number) => (
        <div
          key={row.period ? String(row.period) : i}
          className="grid grid-cols-[1fr_55px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.period ? String(row.period) : row.date ? String(row.date) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {row.inflows != null ? fmtBnSigned(Math.abs(row.inflows)) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {row.outflows != null ? `-${fmtBn(Math.abs(row.outflows)).replace('$', '')}` : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(row.netFlow)}`}>
            {fmtBnSigned(row.netFlow)}
          </span>
          <span className={`text-[8px] font-mono text-right ${flowColor(row.cumFlow)}`}>
            {row.cumFlow != null ? fmtBnSigned(row.cumFlow) : '--'}
          </span>
        </div>
      ))}

      {flowData.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Flow bar visualization */}
      {flowData.length > 0 ? (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'mmfNetFlowChart', 'Net Flow Distribution')}
            </span>
          </div>
          <div className="px-3 py-2">
            {flowData.map((row: any, i: number) => {
              const maxFlow = Math.max(
                ...flowData.map((r: any) => Math.abs(r.netFlow ?? 0)),
                1
              );
              const pct = Math.min(Math.abs(row.netFlow ?? 0) / maxFlow * 50, 50);
              const isPositive = (row.netFlow ?? 0) >= 0;
              return (
                <div
                  key={`bar-${row.period ? String(row.period) : i}`}
                  className="flex items-center gap-2 py-px"
                >
                  <span className="text-[7px] font-mono text-neutral-500 w-12 text-right shrink-0 truncate">
                    {row.period ? String(row.period) : String(i)}
                  </span>
                  <div className="flex-1 h-[5px] bg-neutral-900 relative">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-neutral-700" />
                    {isPositive ? (
                      <div
                        className="absolute inset-y-0 left-1/2 bg-green-500"
                        style={{ width: `${pct}%` }}
                      />
                    ) : (
                      <div
                        className="absolute inset-y-0 bg-red-500"
                        style={{ width: `${pct}%`, right: '50%' }}
                      />
                    )}
                  </div>
                  <span className={`text-[7px] font-mono w-12 text-right shrink-0 ${flowColor(row.netFlow)}`}>
                    {fmtBnSigned(row.netFlow)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── HOLDINGS View ──

function HoldingsView({ d, t }: { d: any; t: TFn }) {
  const holdings = d?.holdings ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400">
          {tr(t, 'mmfHoldingsBreakdown', 'Holdings Breakdown')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_50px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmfAssetType', 'Asset Type')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfAmount', 'Amount')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfAllocation', 'Alloc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfYield', 'Yield')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfChgWk', 'Chg (Wk)')}
        </span>
      </div>

      {/* Holdings rows */}
      {holdings.map((h: any, i: number) => (
        <div
          key={h.assetType ? String(h.assetType) : h.name ? String(h.name) : i}
          className="grid grid-cols-[1fr_55px_55px_50px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {h.assetType ? String(h.assetType) : h.name ? String(h.name) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtBn(h.amount)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1 bg-neutral-800">
              <div
                className="h-full bg-indigo-400/60"
                style={{ width: `${Math.min(h.allocation ?? h.pct ?? 0, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral-400 w-10 text-right">
              {fmtPct(h.allocation ?? h.pct)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-indigo-400 text-right">
            {h.yield != null ? fmtPct(h.yield) : h.avgYield != null ? fmtPct(h.avgYield) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(h.weeklyChange ?? h.change)}`}>
            {fmtBps(h.weeklyChange ?? h.change)}
          </span>
        </div>
      ))}

      {holdings.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Maturity profile */}
      {d?.summary?.maturityProfile && (d.summary.maturityProfile as any[]).length > 0 ? (
        <>
          <div className="px-3 py-1 border-b border-border/10 border-t border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'mmfMaturityProfile', 'Maturity Profile')}
            </span>
          </div>

          {(d.summary.maturityProfile as any[]).map((m: any) => (
            <div
              key={m.bucket ? String(m.bucket) : String(m.range)}
              className="flex items-center justify-between px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase">
                {m.bucket ? String(m.bucket) : String(m.range)}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[8px] font-mono text-neutral-400">
                  {fmtBn(m.amount)}
                </span>
                <div className="w-24 h-1.5 bg-neutral-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                    style={{ width: `${Math.min(m.pct ?? m.share ?? 0, 100)}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-indigo-400 w-10 text-right">
                  {fmtPct(m.pct ?? m.share)}
                </span>
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}

// ── YIELDS View ──

function YieldsView({ d, t }: { d: any; t: TFn }) {
  const yieldHistory = d?.yieldHistory ?? [];

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400">
          {tr(t, 'mmfYieldHistory', 'Yield History')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_50px_55px_55px_55px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mmfCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfCurrent', 'Current')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmfChgBps', 'Chg (bp)')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmf30dAvg', '30D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmf90dAvg', '90D Avg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'mmf52wRange', '52W Rng')}
        </span>
      </div>

      {/* Yield rows */}
      {yieldHistory.map((row: any, i: number) => (
        <div
          key={row.category ? String(row.category) : row.name ? String(row.name) : i}
          className="grid grid-cols-[1fr_55px_50px_55px_55px_55px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {row.category ? String(row.category) : row.name ? String(row.name) : '--'}
          </span>
          <span className="text-[8px] font-mono font-bold text-indigo-400 text-right">
            {fmtRate3(row.currentYield ?? row.yield)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.changeBps ?? row.change)}`}>
            {fmtBps(row.changeBps ?? row.change)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate3(row.avg30d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate3(row.avg90d)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {row.low52w != null && row.high52w != null
              ? `${row.low52w.toFixed(2)}-${row.high52w.toFixed(2)}`
              : '--'}
          </span>
        </div>
      ))}

      {yieldHistory.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}

      {/* Yield curve visualization */}
      {yieldHistory.length > 0 ? (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'mmfYieldComparison', 'Yield Comparison')}
            </span>
          </div>
          <div className="px-3 py-2">
            {yieldHistory.map((row: any, i: number) => {
              const maxYield = Math.max(
                ...yieldHistory.map((r: any) => r.currentYield ?? r.yield ?? 0),
                0.01
              );
              const pct = Math.min(
                ((row.currentYield ?? row.yield ?? 0) / maxYield) * 100,
                100
              );
              return (
                <div
                  key={`ybar-${row.category ? String(row.category) : row.name ? String(row.name) : i}`}
                  className="flex items-center gap-2 py-px"
                >
                  <span className="text-[7px] font-mono text-neutral-500 w-16 text-right shrink-0 truncate uppercase">
                    {row.category ? String(row.category) : row.name ? String(row.name) : '--'}
                  </span>
                  <div className="flex-1 h-[5px] bg-neutral-900">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-mono text-indigo-400 w-12 text-right shrink-0">
                    {fmtPct(row.currentYield ?? row.yield)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Yield spread analysis */}
      {d?.summary?.yieldSpreads && (d.summary.yieldSpreads as any[]).length > 0 ? (
        <>
          <div className="px-3 py-1 border-b border-border/10 border-t border-border/20 bg-[#030303]">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'mmfYieldSpreads', 'Yield Spreads vs Benchmarks')}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_55px_50px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'mmfBenchmark', 'Benchmark')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'mmfSpread', 'Sprd (bp)')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              {tr(t, 'mmfChg', 'Chg')}
            </span>
          </div>

          {(d.summary.yieldSpreads as any[]).map((s: any) => (
            <div
              key={s.benchmark ? String(s.benchmark) : String(s.name)}
              className="grid grid-cols-[1fr_55px_50px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
                {s.benchmark ? String(s.benchmark) : String(s.name)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${
                (s.spread ?? 0) > 0 ? 'text-green-400' : (s.spread ?? 0) < 0 ? 'text-red-400' : 'text-neutral-400'
              }`}>
                {fmtBps(s.spread)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s.change)}`}>
                {fmtBps(s.change)}
              </span>
            </div>
          ))}
        </>
      ) : null}
    </div>
  );
}
