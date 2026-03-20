import { useState } from 'react';
import { useSovereignBondAuction } from '../../api/hooks/use-sovereign-bond-auction';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

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

function fmtDateLong(d: string): string {
  if (!d) return '--';
  const dt = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[dt.getMonth()]} ${dt.getDate()}`;
}

// -- Color helpers --

function tailColor(tail: number): string {
  if (tail <= 0) return 'text-green-400';
  if (tail <= 1) return 'text-yellow-400';
  return 'text-red-400';
}

function btcColor(btc: number): string {
  if (btc >= 2.5) return 'text-green-400';
  if (btc >= 2.0) return 'text-yellow-400';
  return 'text-red-400';
}

function statusColor(status: string): string {
  const s = (status || '').toLowerCase();
  if (s === 'strong') return 'text-green-400 bg-green-500/10';
  if (s === 'average' || s === 'fair') return 'text-yellow-400 bg-yellow-500/10';
  if (s === 'weak') return 'text-red-400 bg-red-500/10';
  return 'text-neutral-500 bg-neutral-500/10';
}

function trendColor(trend: string): string {
  const t = (trend || '').toLowerCase();
  if (t === 'improving' || t === 'up') return 'text-green-400';
  if (t === 'deteriorating' || t === 'down') return 'text-red-400';
  return 'text-yellow-400';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- Types --

type Tab = 'UPCOMING' | 'RESULTS' | 'CALENDAR' | 'STATISTICS';

// -- Shimmer skeleton --

function Shimmer({ rows = 6 }: { rows?: number }) {
  return (
    <div className="px-3 py-2 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-2 animate-pulse">
          <div className="h-3 bg-purple-400/[0.06] flex-[2]" />
          <div className="h-3 bg-purple-400/[0.04] flex-1" />
          <div className="h-3 bg-purple-400/[0.05] flex-1" />
          <div className="h-3 bg-purple-400/[0.03] flex-[0.6]" />
        </div>
      ))}
    </div>
  );
}

// -- Main Panel --

export function SovereignBondAuctionPanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('UPCOMING');
  const { data, isLoading, error, refetch } = useSovereignBondAuction();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr(t, 'sbaSovereignBondAuction', 'Sovereign Bond Auction Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['UPCOMING', 'RESULTS', 'CALENDAR', 'STATISTICS'] as Tab[]).map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t_
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {t_}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !data && <Shimmer rows={8} />}

        {/* Error state */}
        {error && !data ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
              {tr(t, 'sbaError', 'Failed to load auction data')}
            </span>
            <button
              onClick={() => refetch()}
              className="px-3 py-1 border border-purple-400/30 text-[8px] font-mono font-bold uppercase tracking-wider text-purple-400 hover:bg-purple-400/10 transition-colors"
            >
              {tr(t, 'sbaRetry', 'Retry')}
            </button>
          </div>
        ) : null}

        {/* No data state */}
        {!data && !isLoading && !error ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'sbaNoData', 'No auction data available')}
          </div>
        ) : null}

        {data && tab === 'UPCOMING' ? <UpcomingTab data={data} t={t} /> : null}
        {data && tab === 'RESULTS' ? <ResultsTab data={data} t={t} /> : null}
        {data && tab === 'CALENDAR' ? <CalendarTab data={data} t={t} /> : null}
        {data && tab === 'STATISTICS' ? <StatisticsTab data={data} t={t} /> : null}
      </div>
    </div>
  );
}

// -- UPCOMING Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function UpcomingTab({ data, t }: { data: any; t: TFn }) {
  const upcoming = data?.upcoming || [];

  if (upcoming.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'sbaNoUpcoming', 'No upcoming auctions')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sbaUpcomingAuctions', 'Upcoming Auctions')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.2fr_0.6fr_0.8fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'sbaSecurity', 'Security')}</span>
        <span className="text-right">{tr(t, 'sbaCountry', 'Country')}</span>
        <span className="text-right">{tr(t, 'sbaDate', 'Date')}</span>
        <span className="text-right">{tr(t, 'sbaTenor', 'Tenor')}</span>
        <span className="text-right">{tr(t, 'sbaEstSize', 'Est Size')}</span>
        <span className="text-right">{tr(t, 'sbaExpYield', 'Exp Yld')}</span>
        <span className="text-right">{tr(t, 'sbaPrevBTC', 'Prev BTC')}</span>
      </div>

      {/* Rows */}
      {upcoming.map((a: Record<string, unknown>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.6fr_0.8fr_0.7fr_0.7fr_0.8fr_0.7fr] px-3 py-1.5 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {String(a?.security ?? '--')}
          </span>
          <span className="text-[8px] font-mono text-purple-400 text-right">
            {String(a?.country ?? '--')}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {a?.date ? fmtDateLong(String(a.date)) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {String(a?.tenor ?? '--')}
          </span>
          <span className="text-[8px] font-mono text-white text-right">
            {a?.estimatedSize != null ? fmtBn(Number(a.estimatedSize)) : a?.amount != null ? fmtBn(Number(a.amount)) : '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-purple-400 text-right">
            {a?.expectedYield != null ? fmtYield(Number(a.expectedYield)) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${a?.previousBidToCover != null ? btcColor(Number(a.previousBidToCover)) : 'text-neutral-500'}`}>
            {a?.previousBidToCover != null ? Number(a.previousBidToCover).toFixed(2) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- RESULTS Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ResultsTab({ data, t }: { data: any; t: TFn }) {
  const recent = data?.recent || [];

  if (recent.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'sbaNoResults', 'No recent results')}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sbaRecentResults', 'Recent Auction Results')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.2fr_0.5fr_0.6fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'sbaSecurity', 'Security')}</span>
        <span className="text-right">{tr(t, 'sbaCtry', 'Ctry')}</span>
        <span className="text-right">{tr(t, 'sbaDate', 'Date')}</span>
        <span className="text-right">{tr(t, 'sbaHighYield', 'High Yld')}</span>
        <span className="text-right">{tr(t, 'sbaBTC', 'BTC')}</span>
        <span className="text-right">{tr(t, 'sbaTail', 'Tail')}</span>
        <span className="text-right">{tr(t, 'sbaIndirect', 'Indir')}</span>
        <span className="text-right">{tr(t, 'sbaDirect', 'Direct')}</span>
        <span className="text-right">{tr(t, 'sbaDealer', 'Dealer')}</span>
        <span className="text-center">{tr(t, 'sbaStatus', 'Sts')}</span>
      </div>

      {/* Rows */}
      {recent.map((a: Record<string, unknown>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1.2fr_0.5fr_0.6fr_0.7fr_0.6fr_0.5fr_0.5fr_0.5fr_0.5fr_0.4fr] px-3 py-1.5 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {String(a?.security ?? '--')}
          </span>
          <span className="text-[8px] font-mono text-purple-400 text-right">
            {String(a?.country ?? '--')}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {a?.date ? fmtDate(String(a.date)) : '--'}
          </span>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {a?.highYield != null ? fmtYield(Number(a.highYield)) : '--'}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${a?.bidToCover != null ? btcColor(Number(a.bidToCover)) : 'text-neutral-500'}`}>
            {a?.bidToCover != null ? Number(a.bidToCover).toFixed(2) : '--'}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${a?.tail != null ? tailColor(Number(a.tail)) : 'text-neutral-500'}`}>
            {a?.tail != null ? fmtBps(Number(a.tail)) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {a?.indirectPct != null ? fmtPct(Number(a.indirectPct)) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {a?.directPct != null ? fmtPct(Number(a.directPct)) : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {a?.dealerPct != null ? fmtPct(Number(a.dealerPct)) : '--'}
          </span>
          <span className="text-center">
            {a?.status ? (
              <span className={`text-[7px] font-mono font-black px-1 py-px ${statusColor(String(a.status))}`}>
                {String(a.status).toUpperCase().slice(0, 3)}
              </span>
            ) : (
              <span className="text-[7px] font-mono text-neutral-600">--</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- CALENDAR Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CalendarTab({ data, t }: { data: any; t: TFn }) {
  const calendar = data?.calendar || [];

  if (calendar.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'sbaNoCalendar', 'No calendar data')}
      </div>
    );
  }

  // Group calendar entries by week or date
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  for (const entry of calendar) {
    const week = String((entry as Record<string, unknown>)?.week ?? (entry as Record<string, unknown>)?.date ?? 'Unknown');
    if (!grouped[week]) grouped[week] = [];
    grouped[week].push(entry as Record<string, unknown>);
  }

  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sbaAuctionCalendar', 'Auction Calendar')}
        </span>
      </div>

      {Object.entries(grouped).map(([week, entries]) => (
        <div key={week} className="border-b border-border/20">
          {/* Week header */}
          <div className="px-3 py-1 bg-purple-400/[0.03] border-b border-border/10">
            <span className="text-[8px] font-mono font-black text-purple-400 uppercase tracking-wider">
              {week}
            </span>
          </div>

          {/* Column header */}
          <div className="grid grid-cols-[1fr_0.6fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>{tr(t, 'sbaSecurity', 'Security')}</span>
            <span className="text-right">{tr(t, 'sbaCountry', 'Country')}</span>
            <span className="text-right">{tr(t, 'sbaDate', 'Date')}</span>
            <span className="text-right">{tr(t, 'sbaTenor', 'Tenor')}</span>
            <span className="text-right">{tr(t, 'sbaAmount', 'Amount')}</span>
            <span className="text-right">{tr(t, 'sbaCurrency', 'Ccy')}</span>
          </div>

          {/* Rows */}
          {entries.map((entry, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_0.6fr_0.7fr_0.7fr_0.7fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white truncate">
                {String(entry?.security ?? entry?.description ?? '--')}
              </span>
              <span className="text-[8px] font-mono text-purple-400 text-right">
                {String(entry?.country ?? '--')}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {entry?.date ? fmtDateLong(String(entry.date)) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 text-right">
                {String(entry?.tenor ?? '--')}
              </span>
              <span className="text-[8px] font-mono text-white text-right">
                {entry?.amount != null ? fmtBn(Number(entry.amount)) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-500 text-right">
                {String(entry?.currency ?? '--')}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// -- STATISTICS Tab --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatisticsTab({ data, t }: { data: any; t: TFn }) {
  const stats = data?.stats;

  if (!stats) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'sbaNoStats', 'No statistics available')}
      </div>
    );
  }

  const countryStats = stats?.countryBreakdown || stats?.byCountry || [];
  const tenorStats = stats?.tenorBreakdown || stats?.byTenor || [];
  const summary = stats?.summary || stats;

  return (
    <div>
      {/* Summary Metrics */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'sbaSummary', 'Summary')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border/10">
          {/* Avg Bid-to-Cover */}
          <div className="px-3 py-2 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'sbaAvgBTC', 'Avg Bid-to-Cover')}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-[16px] font-mono font-black ${summary?.avgBidToCover != null ? btcColor(Number(summary.avgBidToCover)) : 'text-neutral-500'}`}>
                {summary?.avgBidToCover != null ? Number(summary.avgBidToCover).toFixed(2) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-500">x</span>
            </div>
          </div>

          {/* Avg Tail */}
          <div className="px-3 py-2 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'sbaAvgTail', 'Avg Tail')}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={`text-[16px] font-mono font-black ${summary?.avgTail != null ? tailColor(Number(summary.avgTail)) : 'text-neutral-500'}`}>
                {summary?.avgTail != null ? fmtBps(Number(summary.avgTail)) : '--'}
              </span>
            </div>
          </div>

          {/* Total Issuance */}
          <div className="px-3 py-2 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'sbaTotalIssuance', 'Total Issuance')}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[16px] font-mono font-black text-white">
                {summary?.totalIssuance != null ? fmtBn(Number(summary.totalIssuance)) : '--'}
              </span>
            </div>
          </div>

          {/* Auction Count */}
          <div className="px-3 py-2 bg-black">
            <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
              {tr(t, 'sbaAuctionCount', 'Auction Count')}
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className="text-[16px] font-mono font-black text-purple-400">
                {summary?.auctionCount != null ? String(summary.auctionCount) : summary?.totalAuctions != null ? String(summary.totalAuctions) : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Country Breakdown */}
      {countryStats.length > 0 ? (
        <div className="border-b border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'sbaByCountry', 'By Country')}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>{tr(t, 'sbaCountry', 'Country')}</span>
            <span className="text-right">{tr(t, 'sbaAvgBTCShort', 'Avg BTC')}</span>
            <span className="text-right">{tr(t, 'sbaAvgTailShort', 'Avg Tail')}</span>
            <span className="text-right">{tr(t, 'sbaIssuance', 'Issuance')}</span>
            <span className="text-right">{tr(t, 'sbaTrend', 'Trend')}</span>
          </div>

          {countryStats.map((cs: Record<string, unknown>, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1 h-3"
                  style={{
                    backgroundColor: i === 0
                      ? 'rgba(192,132,252,0.6)'
                      : i === 1
                        ? 'rgba(192,132,252,0.4)'
                        : i === 2
                          ? 'rgba(192,132,252,0.25)'
                          : 'rgba(192,132,252,0.12)',
                  }}
                />
                <span className="text-[9px] font-mono font-bold text-white">
                  {String(cs?.country ?? '--')}
                </span>
              </div>
              <span className={`text-[8px] font-mono font-bold text-right ${cs?.avgBidToCover != null ? btcColor(Number(cs.avgBidToCover)) : 'text-neutral-500'}`}>
                {cs?.avgBidToCover != null ? Number(cs.avgBidToCover).toFixed(2) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${cs?.avgTail != null ? tailColor(Number(cs.avgTail)) : 'text-neutral-500'}`}>
                {cs?.avgTail != null ? fmtBps(Number(cs.avgTail)) : '--'}
              </span>
              <span className="text-[8px] font-mono text-white text-right">
                {cs?.totalIssuance != null ? fmtBn(Number(cs.totalIssuance)) : cs?.issuance != null ? fmtBn(Number(cs.issuance)) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${cs?.trend ? trendColor(String(cs.trend)) : 'text-neutral-500'}`}>
                {cs?.trend ? String(cs.trend).toUpperCase() : '--'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Tenor Breakdown */}
      {tenorStats.length > 0 ? (
        <div>
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'sbaByTenor', 'By Tenor')}
            </span>
          </div>

          <div className="grid grid-cols-[0.8fr_0.7fr_0.7fr_0.7fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
            <span>{tr(t, 'sbaTenor', 'Tenor')}</span>
            <span className="text-right">{tr(t, 'sbaAvgBTCShort', 'Avg BTC')}</span>
            <span className="text-right">{tr(t, 'sbaAvgTailShort', 'Avg Tail')}</span>
            <span className="text-right">{tr(t, 'sbaAvgIndirect', 'Avg Indir')}</span>
            <span className="text-right">{tr(t, 'sbaSamples', 'N')}</span>
            <span className="text-right">{tr(t, 'sbaTrend', 'Trend')}</span>
          </div>

          {tenorStats.map((ts: Record<string, unknown>, i: number) => (
            <div
              key={i}
              className="grid grid-cols-[0.8fr_0.7fr_0.7fr_0.7fr_0.6fr_0.7fr] px-3 py-1.5 border-b border-border/20 hover:bg-purple-400/[0.02] transition-colors"
            >
              <span className="text-[9px] font-mono font-bold text-white">
                {String(ts?.tenor ?? '--')}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${ts?.avgBidToCover != null ? btcColor(Number(ts.avgBidToCover)) : 'text-neutral-500'}`}>
                {ts?.avgBidToCover != null ? Number(ts.avgBidToCover).toFixed(2) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${ts?.avgTail != null ? tailColor(Number(ts.avgTail)) : 'text-neutral-500'}`}>
                {ts?.avgTail != null ? fmtBps(Number(ts.avgTail)) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {ts?.avgIndirect != null ? fmtPct(Number(ts.avgIndirect)) : '--'}
              </span>
              <span className="text-[8px] font-mono text-neutral-500 text-right">
                {ts?.sampleSize != null ? String(ts.sampleSize) : ts?.count != null ? String(ts.count) : '--'}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${ts?.trend ? trendColor(String(ts.trend)) : 'text-neutral-500'}`}>
                {ts?.trend ? String(ts.trend).toUpperCase() : '--'}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {/* Demand Trend (if available) */}
      {stats?.demandTrend ? (
        <div className="border-t border-border/20">
          <div className="px-3 py-1 border-b border-border/10">
            <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
              {tr(t, 'sbaDemandTrend', 'Demand Trend')}
            </span>
          </div>

          <div className="px-3 py-2 flex gap-4">
            {/* Indirect trend */}
            <div>
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'sbaIndirectDemand', 'Indirect')}
              </div>
              <div className={`text-[12px] font-mono font-black mt-0.5 ${
                stats.demandTrend?.indirect != null ? changeColor(Number(stats.demandTrend.indirect)) : 'text-neutral-500'
              }`}>
                {stats.demandTrend?.indirect != null
                  ? `${Number(stats.demandTrend.indirect) >= 0 ? '+' : ''}${fmtPct(Number(stats.demandTrend.indirect))}`
                  : '--'}
              </div>
            </div>

            {/* Direct trend */}
            <div>
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'sbaDirectDemand', 'Direct')}
              </div>
              <div className={`text-[12px] font-mono font-black mt-0.5 ${
                stats.demandTrend?.direct != null ? changeColor(Number(stats.demandTrend.direct)) : 'text-neutral-500'
              }`}>
                {stats.demandTrend?.direct != null
                  ? `${Number(stats.demandTrend.direct) >= 0 ? '+' : ''}${fmtPct(Number(stats.demandTrend.direct))}`
                  : '--'}
              </div>
            </div>

            {/* Dealer trend */}
            <div>
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                {tr(t, 'sbaDealerDemand', 'Dealer')}
              </div>
              <div className={`text-[12px] font-mono font-black mt-0.5 ${
                stats.demandTrend?.dealer != null ? changeColor(Number(stats.demandTrend.dealer)) : 'text-neutral-500'
              }`}>
                {stats.demandTrend?.dealer != null
                  ? `${Number(stats.demandTrend.dealer) >= 0 ? '+' : ''}${fmtPct(Number(stats.demandTrend.dealer))}`
                  : '--'}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
