import { useState } from 'react';
import { useTreasuryAuction } from '../../api/hooks/use-treasury-auction';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// -- Formatting helpers --

function fmtBn(n: number): string {
  if (Math.abs(n) >= 1e12) return (n / 1e12).toFixed(1) + 'T';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

function fmtYield(n: number): string {
  return n.toFixed(3) + '%';
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

function fmtDate(d: string): string {
  if (!d) return '--';
  const dt = new Date(d);
  return `${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}`;
}

// -- Color helpers --

function gradeColor(grade: string): string {
  const g = (grade || '').toUpperCase();
  if (g === 'A' || g === 'A+') return 'text-green-400 bg-green-500/10';
  if (g === 'B' || g === 'B+') return 'text-cyan-400 bg-cyan-500/10';
  if (g === 'C' || g === 'C+') return 'text-yellow-400 bg-yellow-500/10';
  if (g === 'D' || g === 'F') return 'text-red-400 bg-red-500/10';
  return 'text-neutral-500 bg-neutral-500/10';
}

function tailColor(tail: number): string {
  if (tail <= 0) return 'text-green-400';
  if (tail <= 1) return 'text-yellow-400';
  return 'text-red-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- Types --

type Tab = 'RECENT' | 'UPCOMING' | 'DEMAND' | 'FOREIGN';

// -- Main Panel --

export function TreasuryAuctionPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('RECENT');
  const { data, isLoading, refetch } = useTreasuryAuction();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'taTreasuryAuctionMonitor', 'Treasury Auction Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['RECENT', 'UPCOMING', 'DEMAND', 'FOREIGN'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'taNoData', 'No auction data available')}
          </div>
        )}

        {data && tab === 'RECENT' && <RecentTab data={data} t={t} />}
        {data && tab === 'UPCOMING' && <UpcomingTab data={data} t={t} />}
        {data && tab === 'DEMAND' && <DemandTab data={data} t={t} />}
        {data && tab === 'FOREIGN' && <ForeignTab data={data} t={t} />}
      </div>
    </div>
  );
}

// -- RECENT Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecentTab({ data, t }: { data: any; t: TFn }) {
  const auctions = data?.recentAuctions || [];
  const tailAnalysis = data?.tailAnalysis || [];

  if (auctions.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'taNoRecentAuctions', 'No recent auctions')}
      </div>
    );
  }

  return (
    <div>
      {/* Recent Auctions Table */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'taRecentAuctions', 'Recent Auctions')}
          </span>
        </div>

        {/* Header */}
        <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_0.4fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
          <span>{tr(t, 'taSecurity', 'Security')}</span>
          <span className="text-right">{tr(t, 'taDate', 'Date')}</span>
          <span className="text-right">{tr(t, 'taSize', 'Size')}</span>
          <span className="text-right">{tr(t, 'taHighYield', 'High Yld')}</span>
          <span className="text-right">{tr(t, 'taBTC', 'BTC')}</span>
          <span className="text-right">{tr(t, 'taTail', 'Tail')}</span>
          <span className="text-right">{tr(t, 'taPrimary', 'Prim')}</span>
          <span className="text-right">{tr(t, 'taDirect', 'Direct')}</span>
          <span className="text-right">{tr(t, 'taIndirect', 'Indirect')}</span>
          <span className="text-center">{tr(t, 'taGrade', 'Grd')}</span>
        </div>

        {/* Rows */}
        {auctions.slice(0, 8).map((a: Record<string, unknown>, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr_0.4fr] px-3 py-1.5 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">
              {(a?.security as string) || '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtDate((a?.date as string) || '')}
            </span>
            <span className="text-[8px] font-mono text-white text-right">
              {a?.size ? fmtBn(a.size as number) : '--'}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right">
              {a?.highYield != null ? fmtYield(a.highYield as number) : '--'}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${
              (a?.bidToCover as number) >= 2.5 ? 'text-green-400' : (a?.bidToCover as number) >= 2.0 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {a?.bidToCover != null ? (a.bidToCover as number).toFixed(2) : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${tailColor(a?.tail as number || 0)}`}>
              {a?.tail != null ? fmtBps(a.tail as number) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {a?.primaryPercent != null ? fmtPct(a.primaryPercent as number) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {a?.directPercent != null ? fmtPct(a.directPercent as number) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {a?.indirectPercent != null ? fmtPct(a.indirectPercent as number) : '--'}
            </span>
            <span className="text-center">
              {a?.grade ? (
                <span className={`text-[7px] font-mono font-black px-1 py-px ${gradeColor(a.grade as string)}`}>
                  {String(a.grade).toUpperCase()}
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      {/* Tail Analysis */}
      {tailAnalysis.length > 0 && (
        <div>
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'taTailAnalysis', 'Tail Analysis')}
            </span>
          </div>

          <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>{tr(t, 'taSecurity', 'Security')}</span>
            <span className="text-right">{tr(t, 'taAvgTail', 'Avg Tail')}</span>
            <span className="text-right">{tr(t, 'taMinTail', 'Min')}</span>
            <span className="text-right">{tr(t, 'taMaxTail', 'Max')}</span>
            <span className="text-right">{tr(t, 'taTrend', 'Trend')}</span>
          </div>

          {tailAnalysis.map((ta: Record<string, unknown>, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_1fr] px-3 py-1.5 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white truncate">
                {(ta?.security as string) || '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${tailColor(ta?.avgTail as number || 0)}`}>
                {ta?.avgTail != null ? fmtBps(ta.avgTail as number) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {ta?.minTail != null ? fmtBps(ta.minTail as number) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {ta?.maxTail != null ? fmtBps(ta.maxTail as number) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${
                (ta?.trend as string) === 'improving' ? 'text-green-400' :
                (ta?.trend as string) === 'deteriorating' ? 'text-red-400' : 'text-yellow-400'
              }`}>
                {((ta?.trend as string) || 'stable').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// -- UPCOMING Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UpcomingTab({ data, t }: { data: any; t: TFn }) {
  const upcoming = data?.upcomingAuctions || [];

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'taNoUpcoming', 'No upcoming auctions')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'taUpcomingAuctions', 'Upcoming Auctions')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'taSecurity', 'Security')}</span>
        <span className="text-right">{tr(t, 'taDate', 'Date')}</span>
        <span className="text-right">{tr(t, 'taEstSize', 'Est Size')}</span>
        <span className="text-right">{tr(t, 'taWIYield', 'WI Yield')}</span>
        <span className="text-right">{tr(t, 'taPrevYield', 'Prev Yld')}</span>
        <span className="text-right">{tr(t, 'taPrevBTC', 'Prev BTC')}</span>
      </div>

      {/* Rows */}
      {upcoming.slice(0, 4).map((a: Record<string, unknown>, i: number) => {
        const prevYield = a?.previousYield as number | undefined;
        const wiYield = a?.whenIssuedYield as number | undefined;
        const yieldDiff = prevYield != null && wiYield != null ? wiYield - prevYield : null;

        return (
          <div
            key={i}
            className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.9fr_0.8fr] px-3 py-2 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors"
          >
            <div>
              <div className="text-[9px] font-mono font-bold text-white truncate">
                {(a?.security as string) || '--'}
              </div>
              {yieldDiff != null && (
                <div className={`text-[7px] font-mono ${changeColor(yieldDiff)}`}>
                  {yieldDiff >= 0 ? '+' : ''}{yieldDiff.toFixed(3)} vs prev
                </div>
              )}
            </div>
            <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
              {fmtDate((a?.date as string) || '')}
            </span>
            <span className="text-[8px] font-mono text-white text-right self-center">
              {a?.estimatedSize ? fmtBn(a.estimatedSize as number) : '--'}
            </span>
            <span className="text-[9px] font-mono font-bold text-cyan-400 text-right self-center">
              {wiYield != null ? fmtYield(wiYield) : '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right self-center">
              {prevYield != null ? fmtYield(prevYield) : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right self-center ${
              (a?.previousBidToCover as number) >= 2.5 ? 'text-green-400' :
              (a?.previousBidToCover as number) >= 2.0 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {a?.previousBidToCover != null ? (a.previousBidToCover as number).toFixed(2) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- DEMAND Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DemandTab({ data, t }: { data: any; t: TFn }) {
  const demand = data?.demandMetrics;
  const issuance = data?.issuanceSchedule;

  if (!demand && !issuance) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'taNoData', 'No auction data available')}
      </div>
    );
  }

  return (
    <div>
      {/* Demand Metrics Summary */}
      {demand && (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'taDemandMetrics', 'Demand Metrics')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border/10">
            {/* Avg Bid-to-Cover */}
            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taAvgBTC', 'Avg Bid-to-Cover')}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className={`text-[16px] font-mono font-black ${
                  (demand?.avgBidToCover as number) >= 2.5 ? 'text-green-400' :
                  (demand?.avgBidToCover as number) >= 2.0 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {demand?.avgBidToCover != null ? (demand.avgBidToCover as number).toFixed(2) : '--'}
                </span>
                <span className="text-[8px] font-mono text-neutral-500">x</span>
              </div>
            </div>

            {/* Foreign Share */}
            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taForeignShare', 'Foreign / Indirect')}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[16px] font-mono font-black text-cyan-400">
                  {demand?.foreignShare != null ? fmtPct(demand.foreignShare as number) : '--'}
                </span>
              </div>
            </div>

            {/* Primary Dealer Share */}
            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taPrimaryShare', 'Primary Dealer')}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[16px] font-mono font-black text-white">
                  {demand?.primaryShare != null ? fmtPct(demand.primaryShare as number) : '--'}
                </span>
              </div>
            </div>

            {/* Direct Bidder Share */}
            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taDirectShare', 'Direct Bidder')}
              </div>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[16px] font-mono font-black text-white">
                  {demand?.directShare != null ? fmtPct(demand.directShare as number) : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Indirect (Foreign) Share */}
          <div className="px-3 py-2 bg-black border-t border-border/10">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'taIndirectShare', 'Indirect Bidder')}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[16px] font-mono font-black text-white">
                {demand?.indirectShare != null ? fmtPct(demand.indirectShare as number) : '--'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Issuance Schedule Metrics */}
      {issuance && (
        <div>
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'taIssuanceSchedule', 'Issuance Schedule')}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-px bg-border/10">
            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taWeeklyIssuance', 'This Week')}
              </div>
              <div className="text-[14px] font-mono font-black text-white mt-0.5">
                {issuance?.weeklyTotal != null ? fmtBn(issuance.weeklyTotal as number) : '--'}
              </div>
            </div>

            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taMonthlyIssuance', 'This Month')}
              </div>
              <div className="text-[14px] font-mono font-black text-white mt-0.5">
                {issuance?.monthlyTotal != null ? fmtBn(issuance.monthlyTotal as number) : '--'}
              </div>
            </div>

            <div className="px-3 py-2 bg-black">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'taNetIssuance', 'Net Issuance')}
              </div>
              <div className={`text-[14px] font-mono font-black mt-0.5 ${changeColor(issuance?.netIssuance as number || 0)}`}>
                {issuance?.netIssuance != null ? fmtBn(issuance.netIssuance as number) : '--'}
              </div>
            </div>
          </div>

          {/* Maturity Breakdown */}
          {issuance?.maturityBreakdown && (
            <div className="px-3 py-2 border-t border-border/10">
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider mb-1.5">
                {tr(t, 'taMaturityBreakdown', 'Maturity Breakdown')}
              </div>
              <div className="flex gap-3">
                {(issuance.maturityBreakdown as Array<Record<string, unknown>>).map(
                  (mb: Record<string, unknown>, i: number) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono text-neutral-400 uppercase">
                        {(mb?.label as string) || '--'}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-white">
                        {mb?.amount != null ? fmtBn(mb.amount as number) : '--'}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -- FOREIGN Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForeignTab({ data, t }: { data: any; t: TFn }) {
  const holdings = data?.foreignHoldings || [];

  if (holdings.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'taNoForeignData', 'No foreign holdings data')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'taForeignHoldings', 'Major Foreign Holders')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'taCountry', 'Country')}</span>
        <span className="text-right">{tr(t, 'taHoldings', 'Holdings')}</span>
        <span className="text-right">{tr(t, 'ta1MChange', '1M Chg')}</span>
        <span className="text-right">{tr(t, 'taShare', 'Share')}</span>
      </div>

      {/* Rows */}
      {holdings.slice(0, 5).map((h: Record<string, unknown>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr] px-3 py-2 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1 h-4"
              style={{
                backgroundColor: i === 0
                  ? 'rgba(34,211,238,0.6)'
                  : i === 1
                    ? 'rgba(34,211,238,0.4)'
                    : 'rgba(34,211,238,0.12)',
              }}
            />
            <div>
              <div className="text-[9px] font-mono font-bold text-white">
                {(h?.country as string) || '--'}
              </div>
              {h?.rank != null && (
                <div className="text-[7px] font-mono text-neutral-600">
                  #{h.rank as number}
                </div>
              )}
            </div>
          </div>
          <span className="text-[10px] font-mono font-bold text-white text-right self-center">
            {h?.holdings != null ? fmtBn(h.holdings as number) : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right self-center ${changeColor(h?.monthChange as number || 0)}`}>
            {h?.monthChange != null
              ? `${(h.monthChange as number) >= 0 ? '+' : ''}${fmtBn(h.monthChange as number)}`
              : '--'}
          </span>
          <span className="text-[9px] font-mono text-cyan-400 text-right self-center">
            {h?.sharePercent != null ? fmtPct(h.sharePercent as number) : '--'}
          </span>
        </div>
      ))}

      {/* Total */}
      {data?.foreignTotal != null && (
        <div className="px-3 py-2 border-t border-border/20 bg-[rgba(34,211,238,0.12)]">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-mono font-black text-cyan-400 uppercase tracking-wider">
              {tr(t, 'taTotalForeign', 'Total Foreign Holdings')}
            </span>
            <span className="text-[12px] font-mono font-black text-cyan-400">
              {fmtBn(data.foreignTotal as number)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
