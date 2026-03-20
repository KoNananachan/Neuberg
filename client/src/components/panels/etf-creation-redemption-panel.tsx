import { useState } from 'react';
import { useEtfCreationRedemption } from '../../api/hooks/use-etf-creation-redemption';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
// -- Constants --

const EMERALD = '#34d399';
const EMERALD_DIM = 'rgba(52,211,153,0.12)';
const GREEN = '#34d399';
const RED = '#f87171';

type ViewTab = 'OVERVIEW' | 'BASKET' | 'FLOWS' | 'PREMIUM/DISCOUNT';

// -- Color helpers --

function changeColor(val: number): string {
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeSign(val: number): string {
  return val > 0 ? '+' : '';
}

function flowColor(val: number): string {
  if (val > 0) return GREEN;
  if (val < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function flowTypeBadge(type: string): { text: string; bg: string; color: string } {
  switch (type) {
    case 'creation':
      return { text: 'CREATION', bg: 'rgba(52,211,153,0.15)', color: GREEN };
    case 'redemption':
      return { text: 'REDEMPTION', bg: 'rgba(248,113,113,0.15)', color: RED };
    default:
      return { text: type.toUpperCase(), bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
  }
}

function premDiscBadge(val: number): { text: string; bg: string; color: string } {
  if (val > 0.5) return { text: 'PREMIUM', bg: 'rgba(52,211,153,0.15)', color: GREEN };
  if (val < -0.5) return { text: 'DISCOUNT', bg: 'rgba(248,113,113,0.15)', color: RED };
  return { text: 'AT PAR', bg: 'rgba(113,113,122,0.15)', color: '#71717a' };
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtCompactSigned(n: number): string {
  const prefix = n > 0 ? '+$' : n < 0 ? '-$' : '$';
  return prefix + fmtCompact(Math.abs(n));
}

// -- Main Panel --

export function EtfCreationRedemptionPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useEtfCreationRedemption();
  const [view, setView] = useState<ViewTab>('OVERVIEW');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="5" height="10" stroke={EMERALD} strokeWidth="0.8" fill="none" opacity="0.6" />
            <rect x="7" y="1" width="5" height="14" stroke={EMERALD} strokeWidth="0.8" fill="none" opacity="0.8" />
            <path d="M13 5 L15 3 M13 11 L15 13" stroke={EMERALD} strokeWidth="0.8" opacity="0.5" />
            <circle cx="15" cy="3" r="0.8" fill={EMERALD} opacity="0.7" />
            <circle cx="15" cy="13" r="0.8" fill={EMERALD} opacity="0.7" />
            <path d="M3.5 6 L3.5 10 M2 8 L5 8" stroke={EMERALD} strokeWidth="0.6" opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: EMERALD }}>
            {tr(t, 'etfCreationRedemptionTitle', 'ETF Creation / Redemption')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {(['OVERVIEW', 'BASKET', 'FLOWS', 'PREMIUM/DISCOUNT'] as ViewTab[]).map((v) => (
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
        {/* Loading state */}
        {isLoading && !data && (
          <div className="p-2 space-y-1.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-2 animate-pulse">
                <div className="h-3 bg-emerald-400/[0.06] flex-[2]" />
                <div className="h-3 bg-emerald-400/[0.04] flex-1" />
                <div className="h-3 bg-emerald-400/[0.06] flex-1" />
                <div className="h-3 bg-emerald-400/[0.04] flex-[0.5]" />
              </div>
            ))}
            <div className="flex items-center justify-center pt-4 gap-2">
              <div className="w-3 h-3 border border-emerald-400/30 border-t-emerald-400 animate-spin" />
              <span className="text-[8px] text-neutral-600 uppercase tracking-widest">
                {tr(t, 'loading', 'Loading...')}
              </span>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !data ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <svg className="w-5 h-5 text-red-400/60" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1" />
              <path d="M8 4.5 L8 9 M8 10.5 L8 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="text-[9px] text-red-400/80 uppercase tracking-wider">
              {tr(t, 'etfCreationRedemptionError', 'Failed to load ETF data')}
            </span>
            <button
              onClick={() => refetch()}
              className="text-[8px] font-bold uppercase tracking-wider px-3 py-1 border border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10 transition-colors"
            >
              {tr(t, 'retry', 'Retry')}
            </button>
          </div>
        ) : null}

        {/* No data state */}
        {!data && !isLoading && !error ? (
          <div className="text-center py-12 text-neutral-500 text-[9px] uppercase">
            {tr(t, 'etfCreationRedemptionNoData', 'No data available')}
          </div>
        ) : null}

        {/* Tab views */}
        {data && view === 'OVERVIEW' ? <OverviewView data={data} /> : null}
        {data && view === 'BASKET' ? <BasketView data={data} /> : null}
        {data && view === 'FLOWS' ? <FlowsView data={data} /> : null}
        {data && view === 'PREMIUM/DISCOUNT' ? <PremiumDiscountView data={data} /> : null}
      </div>
    </div>
  );
}

// -- OVERVIEW View --

function OverviewView({ data }: { data: any }) {
  const t = useT();
  const etfs: any[] = data?.etfs ?? [];
  const summary = data?.summary;

  return (
    <div className="text-[9px]">
      {/* Summary Metrics */}
      {summary ? (
        <div className="px-2 py-2 border-b border-border/20">
          <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
            {tr(t, 'etfSummary', 'Market Summary')}
          </div>
          <div className="grid grid-cols-6 gap-0 border border-border/10">
            <MetricCell
              label="Total AUM"
              value={summary?.totalAum != null ? `$${fmtCompact(summary.totalAum)}` : '---'}
              color={EMERALD}
            />
            <MetricCell
              label="Net Flows (1D)"
              value={summary?.netFlows1D != null ? fmtCompactSigned(summary.netFlows1D) : '---'}
              color={flowColor(summary?.netFlows1D ?? 0)}
            />
            <MetricCell
              label="Creations"
              value={summary?.totalCreations != null ? String(summary.totalCreations) : '---'}
              color={GREEN}
            />
            <MetricCell
              label="Redemptions"
              value={summary?.totalRedemptions != null ? String(summary.totalRedemptions) : '---'}
              color={RED}
            />
            <MetricCell
              label="Avg Premium"
              value={summary?.avgPremium != null ? fmtPct(summary.avgPremium) : '---'}
              color={summary?.avgPremium > 0 ? GREEN : summary?.avgPremium < 0 ? RED : '#71717a'}
            />
            <MetricCell
              label="Tracked ETFs"
              value={summary?.trackedCount != null ? String(summary.trackedCount) : '---'}
              color="#a1a1aa"
            />
          </div>
        </div>
      ) : null}

      {/* ETF Table */}
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'etfOverviewTable', 'ETF Overview')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_48px_48px_48px_44px_48px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Name / Ticker</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">AUM ($B)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">NAV</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Prem/Disc</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1D Flow</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Units</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Type</span>
        </div>

        {/* Rows */}
        {etfs.map((etf: any, i: number) => {
          const pd = etf?.premiumDiscount ?? 0;
          const pdBadge = premDiscBadge(pd);
          const flowType = etf?.flowType ?? 'creation';
          const ftBadge = flowTypeBadge(flowType);

          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_52px_52px_48px_48px_48px_44px_48px] gap-0 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center"
            >
              <div className="truncate">
                <span className="text-[8px] font-bold text-neutral-300">{etf?.name ? String(etf.name) : '---'}</span>
                {etf?.ticker ? (
                  <span className="text-[7px] text-neutral-600 ml-1">{String(etf.ticker)}</span>
                ) : null}
              </div>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {etf?.aum != null ? Number(etf.aum).toFixed(1) : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
                {etf?.nav != null ? `$${Number(etf.nav).toFixed(2)}` : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {etf?.price != null ? `$${Number(etf.price).toFixed(2)}` : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: pdBadge.color }}>
                {etf?.premiumDiscount != null ? fmtPct(pd) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(etf?.flow1D ?? 0)}`}>
                {etf?.flow1D != null ? fmtCompactSigned(etf.flow1D) : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
                {etf?.units != null ? fmtCompact(etf.units) : '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: ftBadge.bg, color: ftBadge.color }}
                >
                  {ftBadge.text}
                </span>
              </div>
            </div>
          );
        })}

        {etfs.length === 0 ? (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No ETF data available
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- BASKET View --

function BasketView({ data }: { data: any }) {
  const t = useT();
  const basket: any[] = data?.creationBasket ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'etfCreationBasket', 'Creation / Redemption Basket Composition')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_48px_52px_52px_44px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Security / Ticker</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Shares</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Weight %</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Mkt Value</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Price</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Chg %</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Sector</span>
        </div>

        {/* Rows */}
        {basket.map((item: any, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_56px_48px_52px_52px_44px_44px] gap-0 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center"
          >
            <div className="truncate">
              <span className="text-[8px] font-bold text-neutral-300">{item?.name ? String(item.name) : '---'}</span>
              {item?.ticker ? (
                <span className="text-[7px] text-neutral-600 ml-1">{String(item.ticker)}</span>
              ) : null}
            </div>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {item?.shares != null ? fmtCompact(item.shares) : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: EMERALD }}>
              {item?.weight != null ? `${Number(item.weight).toFixed(1)}%` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-400">
              {item?.marketValue != null ? `$${fmtCompact(item.marketValue)}` : '---'}
            </span>
            <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
              {item?.price != null ? `$${Number(item.price).toFixed(2)}` : '---'}
            </span>
            <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(item?.change ?? 0)}`}>
              {item?.change != null ? `${changeSign(item.change)}${Number(item.change).toFixed(2)}%` : '---'}
            </span>
            <span className="text-[7px] font-bold text-right tabular-nums text-neutral-600 truncate pr-1">
              {item?.sector ? String(item.sector) : '---'}
            </span>
          </div>
        ))}

        {basket.length === 0 ? (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No basket data available
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- FLOWS View --

function FlowsView({ data }: { data: any }) {
  const t = useT();
  const flows: any[] = data?.flowHistory ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'etfFlowHistory', 'Creation / Redemption Flow History')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[72px_1fr_56px_56px_56px_52px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">Date</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">ETF</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Type</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Units</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Value ($M)</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">NAV Impact</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Cumulative</span>
        </div>

        {/* Rows */}
        {flows.map((flow: any, i: number) => {
          const flowType = flow?.type ?? 'creation';
          const ftBadge = flowTypeBadge(flowType);

          return (
            <div
              key={i}
              className="grid grid-cols-[72px_1fr_56px_56px_56px_52px_44px] gap-0 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center"
            >
              <span className="text-[8px] font-bold tabular-nums" style={{ color: EMERALD }}>
                {flow?.date ? String(flow.date) : '---'}
              </span>
              <span className="text-[8px] font-bold text-neutral-300 truncate">
                {flow?.etf ? String(flow.etf) : '---'}
              </span>
              <div className="flex justify-end">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: ftBadge.bg, color: ftBadge.color }}
                >
                  {ftBadge.text}
                </span>
              </div>
              <span className="text-[8px] font-bold text-right tabular-nums text-neutral-300">
                {flow?.units != null ? fmtCompact(flow.units) : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: flowColor(flow?.value ?? 0) }}>
                {flow?.value != null ? fmtCompactSigned(flow.value) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(flow?.navImpact ?? 0)}`}>
                {flow?.navImpact != null ? fmtPct(flow.navImpact) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums pr-1 ${changeColor(flow?.cumulative ?? 0)}`}>
                {flow?.cumulative != null ? fmtCompactSigned(flow.cumulative) : '---'}
              </span>
            </div>
          );
        })}

        {flows.length === 0 ? (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No flow history available
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- PREMIUM/DISCOUNT View --

function PremiumDiscountView({ data }: { data: any }) {
  const t = useT();
  const history: any[] = data?.premiumDiscountHistory ?? [];

  return (
    <div className="text-[9px]">
      <div className="px-2 py-2">
        <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
          {tr(t, 'etfPremiumDiscount', 'Premium / Discount Monitor')}
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1fr_52px_52px_48px_48px_48px_48px_44px] gap-0 px-1 mb-0.5">
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider">ETF / Ticker</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">Current</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">1D Avg</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">5D Avg</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">30D Avg</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">52W High</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right">52W Low</span>
          <span className="text-[6px] text-neutral-600 uppercase tracking-wider text-right pr-1">Status</span>
        </div>

        {/* Rows */}
        {history.map((item: any, i: number) => {
          const current = item?.current ?? 0;
          const badge = premDiscBadge(current);

          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_52px_52px_48px_48px_48px_48px_44px] gap-0 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center"
            >
              <div className="truncate">
                <span className="text-[8px] font-bold text-neutral-300">{item?.name ? String(item.name) : '---'}</span>
                {item?.ticker ? (
                  <span className="text-[7px] text-neutral-600 ml-1">{String(item.ticker)}</span>
                ) : null}
              </div>
              <span className="text-[8px] font-bold text-right tabular-nums" style={{ color: badge.color }}>
                {item?.current != null ? fmtPct(current) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(item?.avg1D ?? 0)}`}>
                {item?.avg1D != null ? fmtPct(item.avg1D) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(item?.avg5D ?? 0)}`}>
                {item?.avg5D != null ? fmtPct(item.avg5D) : '---'}
              </span>
              <span className={`text-[8px] font-bold text-right tabular-nums ${changeColor(item?.avg30D ?? 0)}`}>
                {item?.avg30D != null ? fmtPct(item.avg30D) : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-emerald-400">
                {item?.high52W != null ? fmtPct(item.high52W) : '---'}
              </span>
              <span className="text-[8px] font-bold text-right tabular-nums text-red-400">
                {item?.low52W != null ? fmtPct(item.low52W) : '---'}
              </span>
              <div className="flex justify-end pr-1">
                <span
                  className="text-[7px] font-black uppercase px-1 py-[1px]"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.text}
                </span>
              </div>
            </div>
          );
        })}

        {history.length === 0 ? (
          <div className="text-center py-6 text-neutral-600 text-[8px] uppercase">
            No premium/discount data available
          </div>
        ) : null}
      </div>
    </div>
  );
}

// -- Shared Components --

function MetricCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-2 py-1.5 border-r border-border/10 last:border-r-0">
      <div className="text-[6px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className="text-[11px] font-black tabular-nums mt-0.5" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
