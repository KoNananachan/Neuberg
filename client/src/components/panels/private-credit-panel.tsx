import { usePrivateCredit } from '../../api/hooks/use-private-credit';
import { useT } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Formatting helpers ──

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtBp(n: number): string {
  return n.toFixed(0);
}

function fmtDollarM(n: number): string {
  return `$${n.toFixed(0)}M`;
}

function fmtDollarB(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtLeverage(n: number): string {
  return `${n.toFixed(1)}x`;
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function premiumColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function sentimentBadge(sentiment: string): { text: string; bg: string } {
  const s = sentiment.toLowerCase();
  if (s === 'bullish' || s === 'risk on' || s === 'strong') {
    return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  }
  if (s === 'bearish' || s === 'risk off' || s === 'weak') {
    return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  }
  if (s === 'cautious' || s === 'mixed') {
    return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  }
  return { text: 'text-purple-400', bg: 'bg-purple-500/10 border border-purple-500/30' };
}

// ── Main Panel ──

export function PrivateCreditPanel() {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, isLoading, error } = usePrivateCredit() as { data: any; isLoading: boolean; error: any };

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono">
          {tr(t, 'pcError', 'Failed to load private credit data')}
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* Market Summary Bar */}
        <MarketSummaryBar summary={data.marketSummary} t={t} />

        {/* Direct Lending Table */}
        <DirectLendingTable items={data.directLending} t={t} />

        {/* BDC Performance Table */}
        <BdcPerformanceTable items={data.bdcPerformance} t={t} />

        {/* Middle Market Table */}
        <MiddleMarketTable items={data.middleMarket} t={t} />

        {/* Default & Recovery Table */}
        <DefaultRecoveryTable items={data.defaultAndRecovery} t={t} />
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: TFn }) {
  const badge = sentimentBadge(summary.sentiment ?? '');

  return (
    <div className="grid grid-cols-6 border-b border-border/20">
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcTotalAum', 'Total AUM')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtDollarB(summary.totalAUM)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcDryPowder', 'Dry Powder')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtDollarB(summary.dryPowder)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcAvgSpread', 'Avg Spread')}
        </div>
        <div className="text-[10px] font-bold text-purple-400">
          {fmtBp(summary.avgSpread)} bp
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcAvgLeverage', 'Avg Leverage')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtLeverage(summary.avgLeverage)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcDefaultRate', 'Default Rate')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtPct(summary.trailingDefaultRate)}
        </div>
      </div>
      <div className="px-2 py-1.5 flex items-center">
        <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${badge.text} ${badge.bg}`}>
          {summary.sentiment}
        </span>
      </div>
    </div>
  );
}

// ── Direct Lending Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DirectLendingTable({ items, t }: { items: any[]; t: TFn }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
          {tr(t, 'pcDirectLending', 'Direct Lending')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_60px_56px_48px_60px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcSegment', 'Segment')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcSpreadBp', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcAllInYield', 'Yield %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcLeverage', 'Lever')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcLtv', 'LTV %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcDealSize', 'Deal $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcChange', 'Chg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcWeekChange', '1W Chg')}
        </span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any, idx: number) => (
        <div
          key={item.segment ?? idx}
          className="grid grid-cols-[1fr_56px_60px_56px_48px_60px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {item.segment}
          </span>
          <span className="text-[8px] font-mono font-bold text-purple-400 text-right">
            {fmtBp(item.spread)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(item.allInYield)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtLeverage(item.leverage)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNum(item.ltv, 1)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDollarM(item.dealSize)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(item.change)}`}>
            {fmtChange(item.change)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(item.weekChange)}`}>
            {fmtChange(item.weekChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── BDC Performance Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BdcPerformanceTable({ items, t }: { items: any[]; t: TFn }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
          {tr(t, 'pcBdcPerformance', 'BDC Performance')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcNav', 'NAV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcPremium', 'Prem %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcDivYield', 'Div %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcRoe', 'ROE %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcNonAccruals', 'NonAcc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcTotalAssets', 'Assets $B')}
        </span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any, idx: number) => (
        <div
          key={item.name ?? idx}
          className="grid grid-cols-[1fr_52px_52px_52px_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {item.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtNum(item.nav)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtNum(item.price)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${premiumColor(item.premium)}`}>
            {fmtPct(item.premium)}
          </span>
          <span className="text-[8px] font-mono text-purple-400 text-right">
            {fmtPct(item.dividendYield)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(item.roe)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${item.nonAccruals > 3 ? 'text-red-400' : item.nonAccruals > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {fmtPct(item.nonAccruals)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtDollarB(item.totalAssets)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Middle Market Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MiddleMarketTable({ items, t }: { items: any[]; t: TFn }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
          {tr(t, 'pcMiddleMarket', 'Middle Market')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_64px_56px_56px_52px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcQuarter', 'Quarter')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcDealCount', 'Deals')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcTotalVol', 'Vol $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcAvgSpreadMm', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcAvgLeverageMm', 'Lever')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcAvgLtv', 'LTV %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcDefaultRateMm', 'Def %')}
        </span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any, idx: number) => (
        <div
          key={item.quarter ?? idx}
          className="grid grid-cols-[72px_56px_64px_56px_56px_52px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">
            {item.quarter}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {item.dealCount}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtDollarB(item.totalVolume)}
          </span>
          <span className="text-[8px] font-mono text-purple-400 text-right">
            {fmtBp(item.avgSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtLeverage(item.avgLeverage)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNum(item.avgLTV, 1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${item.defaultRate > 3 ? 'text-red-400' : item.defaultRate > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {fmtPct(item.defaultRate)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Default & Recovery Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DefaultRecoveryTable({ items, t }: { items: any[]; t: TFn }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-purple-400">
          {tr(t, 'pcDefaultRecovery', 'Default & Recovery')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_60px_64px_64px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'pcCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcTrailingDef', 'Trail Def %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcPeakDef', 'Peak Def %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcAvgRecovery', 'Avg Rec %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcVintageStress', 'Vint Str %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'pcWatchlist', 'Watch')}
        </span>
      </div>

      {/* Table rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {items.map((item: any, idx: number) => (
        <div
          key={item.category ?? idx}
          className="grid grid-cols-[1fr_64px_60px_64px_64px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {item.category}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${item.trailingDefault > 3 ? 'text-red-400' : item.trailingDefault > 1.5 ? 'text-yellow-400' : 'text-green-400'}`}>
            {fmtPct(item.trailingDefault)}
          </span>
          <span className="text-[8px] font-mono text-red-400/70 text-right">
            {fmtPct(item.peakDefault)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${item.avgRecovery > 60 ? 'text-green-400' : item.avgRecovery > 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            {fmtPct(item.avgRecovery)}
          </span>
          <span className={`text-[8px] font-mono text-right ${item.vintageStress > 5 ? 'text-red-400' : 'text-neutral-400'}`}>
            {fmtPct(item.vintageStress)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {item.watchlist}
          </span>
        </div>
      ))}
    </div>
  );
}
