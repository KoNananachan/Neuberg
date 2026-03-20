import { useSpacMonitor } from '../../api/hooks/use-spac-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtSize(n: number): string {
  return n.toFixed(0);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtReturn(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function discountColor(n: number): string {
  if (n >= 5) return 'text-green-400';
  if (n >= 2) return 'text-teal-400';
  if (n >= 0) return 'text-neutral-400';
  return 'text-red-400';
}

function performanceColor(n: number): string {
  if (n > 20) return 'text-green-400';
  if (n > 0) return 'text-teal-400';
  if (n > -20) return 'text-yellow-400';
  return 'text-red-400';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

// -- Interfaces --

interface SpacSummary {
  totalActiveSpacs: number;
  avgDiscount: number;
  pendingDeals: number;
  avgTrustSize: number;
  iposPast30d: number;
}

interface ActiveSpac {
  ticker: string;
  name: string;
  price: number;
  nav: number;
  discountPct: number;
  trustSizeM: number;
  deadlineDate: string;
  change1d: number;
}

interface PendingDeal {
  spacTicker: string;
  targetName: string;
  dealValueM: number;
  announcedDate: string;
  expectedClose: string;
  spreadPct: number;
  status: string;
}

interface ArbOpportunity {
  ticker: string;
  price: number;
  nav: number;
  discountPct: number;
  annualizedReturn: number;
  deadline: string;
  trustSizeM: number;
}

interface RecentIpo {
  ticker: string;
  name: string;
  ipoDate: string;
  unitPrice: number;
  trustSizeM: number;
  sponsor: string;
}

interface CompletedDeal {
  ticker: string;
  targetName: string;
  closeDate: string;
  deSpacReturn1m: number;
  deSpacReturn3m: number;
  currentPrice: number;
}

interface Liquidation {
  ticker: string;
  name: string;
  liquidationDate: string;
  redemptionPrice: number;
  trustSizeM: number;
  redemptionPct: number;
}

interface SponsorMetric {
  sponsor: string;
  activeSpacs: number;
  completedDeals: number;
  avgReturn: number;
  totalTrustM: number;
  rank: number;
}

// -- Main Panel --

export function SpacMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useSpacMonitor();

  const summary = data?.summary as SpacSummary | undefined;
  const activeSpacs = data?.activeSpacs as ActiveSpac[] | undefined;
  const pendingDeals = data?.pendingDeals as PendingDeal[] | undefined;
  const arbOpportunities = data?.arbOpportunities as ArbOpportunity[] | undefined;
  const recentIpos = data?.recentIpos as RecentIpo[] | undefined;
  const completedDeals = data?.completedDeals as CompletedDeal[] | undefined;
  const liquidations = data?.liquidations as Liquidation[] | undefined;
  const sponsorMetrics = data?.sponsorMetrics as SponsorMetric[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'panelSpacMonitor', 'SPAC Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'spacNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <MarketStatsBar summary={summary} t={t} />}
            {activeSpacs && activeSpacs.length > 0 && (
              <ActiveSpacsSection spacs={activeSpacs} t={t} />
            )}
            {pendingDeals && pendingDeals.length > 0 && (
              <PendingDealsSection deals={pendingDeals} t={t} />
            )}
            {arbOpportunities && arbOpportunities.length > 0 && (
              <ArbOpportunitiesSection opportunities={arbOpportunities} t={t} />
            )}
            {recentIpos && recentIpos.length > 0 && (
              <RecentIposSection ipos={recentIpos} t={t} />
            )}
            {completedDeals && completedDeals.length > 0 && (
              <CompletedDealsSection deals={completedDeals} t={t} />
            )}
            {liquidations && liquidations.length > 0 && (
              <LiquidationsSection liquidations={liquidations} t={t} />
            )}
            {sponsorMetrics && sponsorMetrics.length > 0 && (
              <SponsorMetricsSection metrics={sponsorMetrics} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Market Stats Bar --

function MarketStatsBar({
  summary,
  t,
}: {
  summary: SpacSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-teal-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spacActiveSpacs', 'Active SPACs')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.totalActiveSpacs}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spacAvgDiscount', 'Avg Discount')}
          </div>
          <div className="text-[10px] font-mono font-bold text-teal-400">
            {fmtPct(summary.avgDiscount)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spacPendingDeals', 'Pending Deals')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.pendingDeals}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spacAvgTrust', 'Avg Trust ($M)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-teal-400">
            {fmtSize(summary.avgTrustSize)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spacIpos30d', 'IPOs (30D)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.iposPast30d}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Active SPACs Section --

function ActiveSpacsSection({
  spacs,
  t,
}: {
  spacs: ActiveSpac[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacActiveTable', 'Active SPACs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_48px_48px_48px_56px_64px_44px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacNav', 'NAV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacDisc', 'Disc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacTrust', 'Trust $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacDeadline', 'Deadline')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spac1dChg', '\u03941D')}
        </span>
      </div>

      {/* Rows */}
      {spacs.map((spac, i) => (
        <div
          key={`${spac.ticker}-${i}`}
          className="grid grid-cols-[56px_1fr_48px_48px_48px_56px_64px_44px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {spac.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {spac.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(spac.price)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(spac.nav)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${discountColor(spac.discountPct)}`}>
            {fmtPct(spac.discountPct)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSize(spac.trustSizeM)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {spac.deadlineDate}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(spac.change1d)}`}>
            {fmtChg(spac.change1d)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Pending Deals Section --

function PendingDealsSection({
  deals,
  t,
}: {
  deals: PendingDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacPendingDealsTable', 'Pending Deals')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_64px_64px_64px_48px_56px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacSpac', 'SPAC')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacDealVal', 'Deal $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacAnnounced', 'Announced')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacExpClose', 'Exp Close')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacStatus', 'Status')}
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => (
        <div
          key={`${deal.spacTicker}-${i}`}
          className="grid grid-cols-[56px_1fr_64px_64px_64px_48px_56px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {deal.spacTicker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {deal.targetName}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtSize(deal.dealValueM)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {deal.announcedDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {deal.expectedClose}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(deal.spreadPct)}`}>
            {fmtPct(deal.spreadPct)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate uppercase">
            {deal.status}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Arbitrage Opportunities Section --

function ArbOpportunitiesSection({
  opportunities,
  t,
}: {
  opportunities: ArbOpportunity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacArbOpps', 'Arbitrage Opportunities')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_48px_48px_48px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacNav', 'NAV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacDisc', 'Disc %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacAnnRtn', 'Ann Rtn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacDeadline', 'Deadline')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacTrust', 'Trust $M')}
        </span>
      </div>

      {/* Rows */}
      {opportunities.map((opp, i) => (
        <div
          key={`${opp.ticker}-${i}`}
          className="grid grid-cols-[56px_48px_48px_48px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {opp.ticker}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(opp.price)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(opp.nav)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${discountColor(opp.discountPct)}`}>
            {fmtPct(opp.discountPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(opp.annualizedReturn)}`}>
            {fmtReturn(opp.annualizedReturn)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {opp.deadline}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtSize(opp.trustSizeM)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent IPOs Section --

function RecentIposSection({
  ipos,
  t,
}: {
  ipos: RecentIpo[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacRecentIpos', 'Recent IPOs')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_64px_48px_56px_80px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacIpoDate', 'IPO Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacUnitPx', 'Unit $')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacTrust', 'Trust $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacSponsor', 'Sponsor')}
        </span>
      </div>

      {/* Rows */}
      {ipos.map((ipo, i) => (
        <div
          key={`${ipo.ticker}-${i}`}
          className="grid grid-cols-[56px_1fr_64px_48px_56px_80px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {ipo.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {ipo.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {ipo.ipoDate}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(ipo.unitPrice)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSize(ipo.trustSizeM)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {ipo.sponsor}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Completed Deals Section --

function CompletedDealsSection({
  deals,
  t,
}: {
  deals: CompletedDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacCompletedDeals', 'Completed Deals (deSPAC)')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_64px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacCloseDate', 'Close Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacRtn1m', '1M Rtn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacRtn3m', '3M Rtn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacCurrPx', 'Curr $')}
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => (
        <div
          key={`${deal.ticker}-${i}`}
          className="grid grid-cols-[56px_1fr_64px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {deal.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {deal.targetName}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {deal.closeDate}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${performanceColor(deal.deSpacReturn1m)}`}>
            {fmtReturn(deal.deSpacReturn1m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${performanceColor(deal.deSpacReturn3m)}`}>
            {fmtReturn(deal.deSpacReturn3m)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            {fmtPrice(deal.currentPrice)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Liquidations Section --

function LiquidationsSection({
  liquidations,
  t,
}: {
  liquidations: Liquidation[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-teal-400/30">
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacLiquidations', 'Liquidations')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_1fr_64px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacTicker', 'Ticker')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacLiqDate', 'Liq Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacRedemPx', 'Redem $')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacTrust', 'Trust $M')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacRedemPct', 'Redem %')}
        </span>
      </div>

      {/* Rows */}
      {liquidations.map((liq, i) => (
        <div
          key={`${liq.ticker}-${i}`}
          className="grid grid-cols-[56px_1fr_64px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {liq.ticker}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {liq.name}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {liq.liquidationDate}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(liq.redemptionPrice)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtSize(liq.trustSizeM)}
          </span>
          <span className="text-[8px] font-mono font-bold text-teal-400 text-right pr-2">
            {fmtPct(liq.redemptionPct)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sponsor Metrics Section --

function SponsorMetricsSection({
  metrics,
  t,
}: {
  metrics: SponsorMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-teal-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spacSponsorMetrics', 'Sponsor Metrics')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[28px_1fr_48px_56px_48px_56px] gap-0 px-2 py-0.5 border-b border-teal-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacRank', '#')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spacSponsor', 'Sponsor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacActive', 'Active')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacCompleted', 'Completed')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spacAvgRtn', 'Avg Rtn')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'spacTotalTrust', 'Trust $M')}
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.sponsor}-${i}`}
          className="grid grid-cols-[28px_1fr_48px_56px_48px_56px] gap-0 px-2 py-[3px] border-b border-teal-400/5 hover:bg-teal-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-500">
            {m.rank}
          </span>
          <span className="text-[8px] font-mono font-bold text-teal-400 truncate">
            {m.sponsor}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {m.activeSpacs}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {m.completedDeals}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${performanceColor(m.avgReturn)}`}>
            {fmtReturn(m.avgReturn)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtSize(m.totalTrustM)}
          </span>
        </div>
      ))}
    </div>
  );
}
