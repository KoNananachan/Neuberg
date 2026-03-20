import { useState } from 'react';
import {
  useSecuritiesFinance,
  type SecuritiesFinanceData,
  type MarginLendingRate,
  type RehypothecationData,
  type CollateralTransformation,
  type FinancingSummary,
} from '../../api/hooks/use-securities-finance';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Constants ──

const ACCENT = '#34d399'; // emerald-400

const TABS = ['lending', 'rehyp', 'transform', 'summary'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  lending: 'Margin Lending',
  rehyp: 'Rehypothecation',
  transform: 'Collateral Xform',
  summary: 'Financing',
};

// ── Formatting helpers ──

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  return `${n.toFixed(1)}bp`;
}

function fmtMoney(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// ── Color helpers ──

function trendColor(trend: string): string {
  if (trend === 'rising') return 'text-red-400';
  if (trend === 'falling') return 'text-green-400';
  return 'text-neutral-500';
}

function trendArrow(trend: string): string {
  if (trend === 'rising') return '\u2191';
  if (trend === 'falling') return '\u2193';
  return '\u2192';
}

function utilizationColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  return 'text-emerald-400';
}

function utilizationBarColor(pct: number): string {
  if (pct >= 90) return '#f87171';
  if (pct >= 75) return '#facc15';
  return ACCENT;
}

function statusColor(status: string): { text: string; bg: string } {
  if (status === 'active') return { text: 'text-emerald-400', bg: 'bg-emerald-500/15 border-emerald-500/30' };
  if (status === 'pending') return { text: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30' };
  return { text: 'text-neutral-500', bg: 'bg-neutral-500/15 border-neutral-500/30' };
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function SecuritiesFinancePanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSecuritiesFinance();
  const [activeTab, setActiveTab] = useState<Tab>('lending');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'sfTitle', 'Securities Finance')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/20 shrink-0 bg-[#030303]">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-2 py-1 text-[7px] font-black font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b border-emerald-400'
                : 'text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sfNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'lending' && (
          <MarginLendingSection rates={data.marginLending} t={t} />
        )}
        {data && activeTab === 'rehyp' && (
          <RehypothecationSection rehyp={data.rehypothecation} t={t} />
        )}
        {data && activeTab === 'transform' && (
          <CollateralTransformSection transforms={data.collateralTransformations} t={t} />
        )}
        {data && activeTab === 'summary' && (
          <FinancingSummarySection summary={data.summary} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Section 1: Margin Lending Rates ──

function MarginLendingSection({
  rates,
  t,
}: {
  rates: MarginLendingRate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sfMarginLending', 'Margin Lending Rates by Asset Class')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_72px_32px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sfAssetClass', 'Asset / Sym')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfRate', 'Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfMarginReq', 'Margin')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfHaircut', 'Haircut')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfUtilization', 'Util')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'sfTrend', 'Trd')}
        </span>
      </div>

      {/* Rows */}
      {rates.map((rate) => (
        <div
          key={`${rate.assetClass}-${rate.symbol}`}
          className="grid grid-cols-[1fr_56px_56px_48px_72px_32px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          {/* Asset class + symbol */}
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-mono font-bold text-white">{rate.symbol}</span>
            <span className="text-[6px] font-mono text-neutral-600 uppercase">{rate.assetClass}</span>
          </div>

          {/* Rate */}
          <span className="text-[8px] font-mono font-bold text-emerald-400 text-right">
            {fmtPct(rate.rate)}
          </span>

          {/* Margin Requirement */}
          <span className="text-[8px] font-mono text-white text-right">
            {fmtPct(rate.marginRequirement)}
          </span>

          {/* Haircut */}
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(rate.haircut)}
          </span>

          {/* Utilization bar */}
          <div className="flex items-center gap-1 justify-end">
            <div className="w-8 h-[3px] bg-neutral-800 relative">
              <div
                className="absolute left-0 top-0 h-full"
                style={{
                  width: `${Math.min(rate.utilization, 100)}%`,
                  backgroundColor: utilizationBarColor(rate.utilization),
                }}
              />
            </div>
            <span className={`text-[7px] font-mono font-bold ${utilizationColor(rate.utilization)}`}>
              {rate.utilization.toFixed(0)}%
            </span>
          </div>

          {/* Trend */}
          <span className={`text-[8px] font-mono font-bold text-center ${trendColor(rate.trend)}`}>
            {trendArrow(rate.trend)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 2: Rehypothecation Monitor ──

function RehypothecationSection({
  rehyp,
  t,
}: {
  rehyp: RehypothecationData;
  t: ReturnType<typeof useT>;
}) {
  const headroomPct = rehyp.rehypLimit > 0
    ? ((rehyp.rehypLimit - rehyp.rehypRate) / rehyp.rehypLimit) * 100
    : 0;
  const isNearLimit = rehyp.rehypRate >= rehyp.rehypLimit * 0.9;

  return (
    <div>
      {/* Totals */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'sfRehypTotals', 'Rehypothecation Totals')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfCollReceived', 'Collateral Received')}
            </div>
            <div className="text-[10px] font-mono font-bold text-white">
              {fmtMoney(rehyp.totalCollateralReceived)}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfRehypothecated', 'Rehypothecated')}
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-400">
              {fmtMoney(rehyp.totalRehypothecated)}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfHeadroom', 'Headroom')}
            </div>
            <div className={`text-[10px] font-mono font-bold ${isNearLimit ? 'text-red-400' : 'text-emerald-400'}`}>
              {fmtPct(rehyp.headroom)}
            </div>
          </div>
        </div>
      </div>

      {/* Rate vs Limit Gauge */}
      <div className="border-b border-border/20 px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sfRateVsLimit', 'Rehyp Rate vs Limit')}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[7px] font-mono text-emerald-400">
              {fmtPct(rehyp.rehypRate)}
            </span>
            <span className="text-[7px] font-mono text-neutral-600">/</span>
            <span className="text-[7px] font-mono text-neutral-400">
              {fmtPct(rehyp.rehypLimit)}
            </span>
          </div>
        </div>

        {/* Gauge bar */}
        <div className="w-full h-2 bg-neutral-900 relative">
          {/* Limit marker */}
          <div
            className="absolute top-0 h-full w-px bg-red-500/60"
            style={{ left: `${Math.min((rehyp.rehypLimit / 100) * 100, 100)}%` }}
          />
          {/* Current rate fill */}
          <div
            className="absolute left-0 top-0 h-full"
            style={{
              width: `${Math.min((rehyp.rehypRate / 100) * 100, 100)}%`,
              backgroundColor: isNearLimit ? '#f87171' : ACCENT,
            }}
          />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[6px] font-mono text-neutral-700">0%</span>
          <span className={`text-[6px] font-mono ${isNearLimit ? 'text-red-400' : 'text-neutral-600'}`}>
            {isNearLimit ? 'NEAR LIMIT' : `${headroomPct.toFixed(0)}% headroom`}
          </span>
          <span className="text-[6px] font-mono text-neutral-700">100%</span>
        </div>
      </div>

      {/* Collateral Breakdown */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'sfCollBreakdown', 'Collateral Breakdown')}
          </span>
        </div>
        {rehyp.collateralBreakdown.map((item) => (
          <div
            key={item.type}
            className="flex items-center justify-between px-3 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-1 h-3" style={{ backgroundColor: ACCENT, opacity: 0.3 + (item.pct / 100) * 0.7 }} />
              <span className="text-[8px] font-mono font-bold text-white uppercase">{item.type}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[8px] font-mono text-neutral-400">
                {fmtMoney(item.amount)}
              </span>
              <div className="flex items-center gap-1">
                <div className="w-12 h-[3px] bg-neutral-800 relative">
                  <div
                    className="absolute left-0 top-0 h-full bg-emerald-400"
                    style={{ width: `${Math.min(item.pct, 100)}%`, opacity: 0.6 }}
                  />
                </div>
                <span className="text-[7px] font-mono font-bold text-emerald-400 w-8 text-right">
                  {item.pct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3: Collateral Transformation ──

function CollateralTransformSection({
  transforms,
  t,
}: {
  transforms: CollateralTransformation[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sfCollTransform', 'Collateral Transformation Trades')}
        </span>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr_1fr_64px_48px_48px_40px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sfFrom', 'From')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'sfTo', 'To')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfNotional', 'Notional')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'sfCost', 'Cost')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'sfTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'sfStatus', 'Status')}
        </span>
      </div>

      {/* Rows */}
      {transforms.map((tx) => {
        const st = statusColor(tx.status);
        return (
          <div
            key={tx.id}
            className="grid grid-cols-[1fr_1fr_64px_48px_48px_40px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            {/* From */}
            <span className="text-[8px] font-mono text-red-400/80 truncate">{tx.fromAsset}</span>

            {/* To */}
            <div className="flex items-center gap-1">
              <span className="text-[6px] font-mono text-neutral-600">{'\u2192'}</span>
              <span className="text-[8px] font-mono text-emerald-400/80 truncate">{tx.toAsset}</span>
            </div>

            {/* Notional */}
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtMoney(tx.notional)}
            </span>

            {/* Spread */}
            <span className="text-[8px] font-mono text-emerald-400 text-right">
              {fmtBps(tx.spread)}
            </span>

            {/* Cost */}
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtBps(tx.costBps)}
            </span>

            {/* Tenor */}
            <span className="text-[7px] font-mono text-neutral-500 text-center uppercase">
              {tx.tenor}
            </span>

            {/* Status */}
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${st.text} ${st.bg}`}>
                {tx.status}
              </span>
            </div>
          </div>
        );
      })}

      {transforms.length === 0 && (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'sfNoTransforms', 'No active transformations')}
        </div>
      )}
    </div>
  );
}

// ── Section 4: Financing Summary ──

function FinancingSummarySection({
  summary,
  t,
}: {
  summary: FinancingSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Book Overview */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'sfBookOverview', 'Financing Book Overview')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {/* Total Book Size */}
          <div className="bg-black px-3 py-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfTotalBook', 'Total Book Size')}
            </div>
            <div className="text-[12px] font-mono font-bold text-white mt-0.5">
              {fmtMoney(summary.totalBookSize)}
            </div>
          </div>

          {/* Net Revenue */}
          <div className="bg-black px-3 py-2">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfNetRevenue', 'Net Financing Revenue')}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[12px] font-mono font-bold text-emerald-400">
                {fmtMoney(summary.netFinancingRevenue)}
              </span>
              <span className={`text-[8px] font-mono font-bold ${changeColor(summary.revenueChange)}`}>
                {fmtChange(summary.revenueChange)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'sfKeyMetrics', 'Key Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-px bg-border/10">
          {/* Avg Rate */}
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfAvgRate', 'Avg Rate')}
            </div>
            <div className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
              {fmtPct(summary.avgRate)}
            </div>
          </div>

          {/* Utilization */}
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfUtilPct', 'Utilization')}
            </div>
            <div className={`text-[10px] font-mono font-bold mt-0.5 ${utilizationColor(summary.utilizationPct)}`}>
              {fmtPct(summary.utilizationPct)}
            </div>
          </div>

          {/* Margin Calls */}
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfMarginCalls', 'Margin Calls')}
            </div>
            <div className={`text-[10px] font-mono font-bold mt-0.5 ${summary.totalMarginCalls > 0 ? 'text-red-400' : 'text-neutral-500'}`}>
              {summary.totalMarginCalls}
            </div>
            {summary.totalMarginCalls > 0 && (
              <div className="text-[7px] font-mono text-red-400/70 mt-0.5">
                {fmtMoney(summary.marginCallValue)}
              </div>
            )}
          </div>

          {/* Pending Settlements */}
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'sfPending', 'Pending')}
            </div>
            <div className={`text-[10px] font-mono font-bold mt-0.5 ${summary.pendingSettlements > 0 ? 'text-yellow-400' : 'text-neutral-500'}`}>
              {summary.pendingSettlements}
            </div>
          </div>
        </div>
      </div>

      {/* Utilization Gauge */}
      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'sfBookUtilization', 'Book Utilization')}
          </span>
          <span className={`text-[8px] font-mono font-bold ${utilizationColor(summary.utilizationPct)}`}>
            {fmtPct(summary.utilizationPct)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-neutral-900 relative">
          <div
            className="absolute left-0 top-0 h-full"
            style={{
              width: `${Math.min(summary.utilizationPct, 100)}%`,
              backgroundColor: utilizationBarColor(summary.utilizationPct),
            }}
          />
          {/* Warning threshold markers */}
          <div className="absolute top-0 h-full w-px bg-yellow-500/40" style={{ left: '75%' }} />
          <div className="absolute top-0 h-full w-px bg-red-500/40" style={{ left: '90%' }} />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[6px] font-mono text-neutral-700">0%</span>
          <span className="text-[6px] font-mono text-yellow-500/40">75%</span>
          <span className="text-[6px] font-mono text-red-500/40">90%</span>
          <span className="text-[6px] font-mono text-neutral-700">100%</span>
        </div>
      </div>
    </div>
  );
}
