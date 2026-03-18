import { useTreasuryAnalytics } from '../../api/hooks/use-treasury-analytics';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtYield(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtBillions(n: number): string {
  return n.toFixed(1);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function tailColor(n: number): string {
  if (n <= -1) return 'text-green-400';
  if (n < 0) return 'text-neutral-300';
  if (n > 2) return 'text-red-400';
  if (n > 0) return 'text-yellow-400';
  return 'text-neutral-500';
}

function trendColor(trend: string): string {
  const t = trend.toUpperCase();
  if (t === 'STRONG' || t === 'IMPROVING') return 'text-green-400';
  if (t === 'WEAK' || t === 'DETERIORATING') return 'text-red-400';
  if (t === 'STABLE') return 'text-neutral-400';
  return 'text-yellow-400';
}

function demandBadge(demand: string): string {
  const d = demand.toUpperCase();
  if (d === 'HIGH' || d === 'STRONG') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (d === 'LOW' || d === 'WEAK') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
}

function liquidityColor(liquidity: string): string {
  const l = liquidity.toUpperCase();
  if (l === 'HIGH' || l === 'GOOD') return 'text-green-400';
  if (l === 'LOW' || l === 'POOR') return 'text-red-400';
  return 'text-yellow-400';
}

// ── Interfaces ──

interface TreasuryAnalyticsSummary {
  totalIssuance: number;
  avgBidToCover: number;
  avgTailBps: number;
  strongestTenor: string;
  weakestTenor: string;
}

interface RecentAuction {
  tenor: string;
  date: string;
  highYield: number;
  bidToCover: number;
  allotment: number;
  direct: number;
  indirect: number;
  dealer: number;
  tailBps: number;
  trend: string;
}

interface OnRunOffRun {
  tenor: string;
  otrYield: number;
  ofrYield: number;
  spreadBps: number;
  cusip: string;
  maturity: string;
  liquidity: string;
}

interface UpcomingAuction {
  tenor: string;
  date: string;
  size: number;
  prevBidToCover: number;
  prevTailBps: number;
  estDemand: string;
}

// ── Main Panel ──

export function TreasuryAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useTreasuryAnalytics();

  const summary = data?.summary as TreasuryAnalyticsSummary | undefined;
  const recentAuctions = data?.recentAuctions as RecentAuction[] | undefined;
  const onRunOffRun = data?.onRunOffRun as OnRunOffRun[] | undefined;
  const upcomingAuctions = data?.upcomingAuctions as UpcomingAuction[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {tr(t, 'treasuryAnalyticsTitle', 'Treasury Analytics')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'treasuryAnalyticsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {recentAuctions && recentAuctions.length > 0 && (
              <RecentAuctionsSection auctions={recentAuctions} t={t} />
            )}
            {onRunOffRun && onRunOffRun.length > 0 && (
              <OnRunOffRunSection items={onRunOffRun} t={t} />
            )}
            {upcomingAuctions && upcomingAuctions.length > 0 && (
              <UpcomingAuctionsSection auctions={upcomingAuctions} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: TreasuryAnalyticsSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-sky-400/10">
        {/* Total Issuance */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'treasuryIssuance', 'Wk Issuance')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            ${fmtBillions(summary.totalIssuance)}B
          </div>
        </div>

        {/* Avg Bid-to-Cover */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'treasuryAvgBtc', 'Avg Bid/Cover')}
          </div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {summary.avgBidToCover.toFixed(2)}x
          </div>
        </div>

        {/* Avg Tail */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'treasuryAvgTail', 'Avg Tail')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${tailColor(summary.avgTailBps)}`}>
            {fmtBps(summary.avgTailBps)}<span className="text-[7px] text-neutral-600">bp</span>
          </div>
        </div>

        {/* Strongest Tenor */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'treasuryStrongest', 'Strongest')}
          </div>
          <div className="text-[10px] font-mono font-bold text-green-400">
            {summary.strongestTenor}
          </div>
        </div>

        {/* Weakest Tenor */}
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'treasuryWeakest', 'Weakest')}
          </div>
          <div className="text-[10px] font-mono font-bold text-red-400">
            {summary.weakestTenor}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Recent Auctions Section ──

function RecentAuctionsSection({
  auctions,
  t,
}: {
  auctions: RecentAuction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'treasuryRecentAuctions', 'Recent Auctions')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-sky-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryTenor', 'Tenor')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryDate', 'Date')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryHighYld', 'High Yld')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryBidCover', 'Bid/Cvr')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryAllot', 'Allot%')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryDirect', 'Direct')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryIndirect', 'Indirect')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryDealer', 'Dealer')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryTail', 'Tail')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'treasuryTrend', 'Trend')}</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a, i) => (
              <tr
                key={`${a.tenor}-${a.date}-${i}`}
                className="border-b border-neutral-900 hover:bg-sky-400/[0.02]"
              >
                <td className="px-2 py-1 text-sky-400 font-bold">{a.tenor}</td>
                <td className="px-2 py-1 text-neutral-400">{a.date}</td>
                <td className="px-2 py-1 text-right text-white font-bold">{fmtYield(a.highYield)}%</td>
                <td className="px-2 py-1 text-right text-white font-bold">{a.bidToCover.toFixed(2)}x</td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(a.allotment)}%</td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(a.direct)}%</td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(a.indirect)}%</td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(a.dealer)}%</td>
                <td className={`px-2 py-1 text-right font-bold ${tailColor(a.tailBps)}`}>
                  {fmtBps(a.tailBps)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span className={`font-bold ${trendColor(a.trend)}`}>
                    {a.trend}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── On-Run vs Off-Run Section ──

function OnRunOffRunSection({
  items,
  t,
}: {
  items: OnRunOffRun[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'treasuryOnRunOffRun', 'On-Run vs Off-Run')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-sky-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryTenor', 'Tenor')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryOtrYld', 'OTR Yld')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryOfrYld', 'OFR Yld')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasurySpread', 'Spread')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryCusip', 'CUSIP')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryMaturity', 'Maturity')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'treasuryLiquidity', 'Liquidity')}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={`${item.tenor}-${item.cusip}-${i}`}
                className="border-b border-neutral-900 hover:bg-sky-400/[0.02]"
              >
                <td className="px-2 py-1 text-sky-400 font-bold">{item.tenor}</td>
                <td className="px-2 py-1 text-right text-white font-bold">{fmtYield(item.otrYield)}%</td>
                <td className="px-2 py-1 text-right text-neutral-300">{fmtYield(item.ofrYield)}%</td>
                <td className={`px-2 py-1 text-right font-bold ${changeColor(item.spreadBps)}`}>
                  {fmtBps(item.spreadBps)}
                </td>
                <td className="px-2 py-1 text-neutral-400">{item.cusip}</td>
                <td className="px-2 py-1 text-neutral-400">{item.maturity}</td>
                <td className="px-2 py-1 text-center">
                  <span className={`font-bold ${liquidityColor(item.liquidity)}`}>
                    {item.liquidity}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Upcoming Auctions Section ──

function UpcomingAuctionsSection({
  auctions,
  t,
}: {
  auctions: UpcomingAuction[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'treasuryUpcoming', 'Upcoming Auctions')}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead>
            <tr className="text-neutral-600 uppercase tracking-wider border-b border-sky-400/10">
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryTenor', 'Tenor')}</th>
              <th className="text-left px-2 py-1 font-normal">{tr(t, 'treasuryDate', 'Date')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasurySize', 'Size ($B)')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryPrevBtc', 'Prev B/C')}</th>
              <th className="text-right px-2 py-1 font-normal">{tr(t, 'treasuryPrevTail', 'Prev Tail')}</th>
              <th className="text-center px-2 py-1 font-normal">{tr(t, 'treasuryEstDemand', 'Est Demand')}</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((a, i) => (
              <tr
                key={`${a.tenor}-${a.date}-${i}`}
                className="border-b border-neutral-900 hover:bg-sky-400/[0.02]"
              >
                <td className="px-2 py-1 text-sky-400 font-bold">{a.tenor}</td>
                <td className="px-2 py-1 text-neutral-400">{a.date}</td>
                <td className="px-2 py-1 text-right text-white font-bold">${fmtBillions(a.size)}B</td>
                <td className="px-2 py-1 text-right text-neutral-300">{a.prevBidToCover.toFixed(2)}x</td>
                <td className={`px-2 py-1 text-right font-bold ${tailColor(a.prevTailBps)}`}>
                  {fmtBps(a.prevTailBps)}
                </td>
                <td className="px-2 py-1 text-center">
                  <span
                    className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${demandBadge(a.estDemand)}`}
                  >
                    {a.estDemand}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
