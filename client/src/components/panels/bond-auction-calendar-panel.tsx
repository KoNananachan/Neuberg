import { useState, useMemo } from 'react';
import { useBondAuctionCalendar } from '../../api/hooks/use-bond-auction-calendar';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface UpcomingAuction {
  date: string;
  country: string;
  security: string;
  amount: number;
  currency: string;
  expectedYield: number | null;
  whenIssuedSpread: number | null;
  tenor: string;
}

interface RecentResult {
  date: string;
  country: string;
  security: string;
  amount: number;
  currency: string;
  highYield: number;
  bidToCover: number;
  tail: number;
  indirectPct: number;
  directPct: number;
  dealerPct: number;
  status: 'strong' | 'average' | 'weak';
}

interface TenorAverage {
  tenor: string;
  avgBidToCover: number;
  avgTail: number;
  avgIndirect: number;
  avgDirect: number;
  trend: 'improving' | 'stable' | 'deteriorating';
  sampleSize: number;
}

interface WeeklyIssuance {
  week: string;
  totalSupply: number;
  netSettlement: number;
  couponPayments: number;
  netCashFlow: number;
  notesBills: { tenor: string; amount: number }[];
}

interface BondAuctionData {
  upcoming: UpcomingAuction[];
  results: RecentResult[];
  analytics: TenorAverage[];
  issuance: WeeklyIssuance[];
  timestamp: string;
}

// ── Formatting helpers ──

const COUNTRY_FLAGS: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}',
  DE: '\u{1F1E9}\u{1F1EA}',
  GB: '\u{1F1EC}\u{1F1E7}',
  JP: '\u{1F1EF}\u{1F1F5}',
  FR: '\u{1F1EB}\u{1F1F7}',
  IT: '\u{1F1EE}\u{1F1F9}',
  CA: '\u{1F1E8}\u{1F1E6}',
  AU: '\u{1F1E6}\u{1F1FA}',
  ES: '\u{1F1EA}\u{1F1F8}',
  CN: '\u{1F1E8}\u{1F1F3}',
};

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function fmtDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
}

function fmtAmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toLocaleString();
}

function fmtYield(n: number | null): string {
  if (n == null) return '--';
  return n.toFixed(3) + '%';
}

function fmtBps(n: number | null): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(1) + 'bp';
}

function fmtPct(n: number): string {
  return n.toFixed(1) + '%';
}

// ── Color helpers ──

function btcColor(btc: number): string {
  if (btc >= 2.8) return 'text-green-400';
  if (btc >= 2.4) return 'text-green-400/70';
  if (btc >= 2.0) return 'text-yellow-400';
  return 'text-red-400';
}

function tailColor(tail: number): string {
  if (tail <= 0) return 'text-green-400';
  if (tail <= 0.5) return 'text-yellow-400';
  return 'text-red-400';
}

function statusColor(status: string): string {
  if (status === 'strong') return 'text-green-400 bg-green-500/10';
  if (status === 'average') return 'text-yellow-400 bg-yellow-500/10';
  return 'text-red-400 bg-red-500/10';
}

function trendIcon(trend: string): string {
  if (trend === 'improving') return '\u2191';
  if (trend === 'deteriorating') return '\u2193';
  return '\u2192';
}

function trendColor(trend: string): string {
  if (trend === 'improving') return 'text-green-400';
  if (trend === 'deteriorating') return 'text-red-400';
  return 'text-yellow-400';
}

function cashFlowColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Tab type ──

type Tab = 'upcoming' | 'results' | 'analytics' | 'issuance';

// ── Main Panel ──

export function BondAuctionCalendarPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useBondAuctionCalendar();
  const [tab, setTab] = useState<Tab>('upcoming');

  const data = rawData as BondAuctionData | undefined;

  const tabs: { key: Tab; label: string }[] = [
    { key: 'upcoming', label: tr(t, 'bacUpcoming', 'Upcoming') },
    { key: 'results', label: tr(t, 'bacResults', 'Results') },
    { key: 'analytics', label: tr(t, 'bacAnalytics', 'Analytics') },
    { key: 'issuance', label: tr(t, 'bacIssuance', 'Issuance') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-400">
            {tr(t, 'bacTitle', 'Bond Auction Calendar')}
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
            className="p-1 text-neutral-500 hover:text-green-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-1.5 text-[8px] font-black font-mono uppercase tracking-widest border-b-2 transition-colors ${
              tab === tb.key
                ? 'border-green-400 text-green-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 animate-spin" />
            <span className="text-[9px] font-mono text-green-400/60 uppercase tracking-widest animate-pulse">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!isLoading && !data && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'bacNoData', 'No auction data available')}
          </div>
        )}

        {data && tab === 'upcoming' && <UpcomingSection auctions={data.upcoming} t={t} />}
        {data && tab === 'results' && <ResultsSection results={data.results} t={t} />}
        {data && tab === 'analytics' && <AnalyticsSection analytics={data.analytics} t={t} />}
        {data && tab === 'issuance' && <IssuanceSection issuance={data.issuance} t={t} />}
      </div>
    </div>
  );
}

// ── Section 1: Upcoming Auctions ──

function UpcomingSection({
  auctions,
  t,
}: {
  auctions: UpcomingAuction[];
  t: ReturnType<typeof useT>;
}) {
  const grouped = useMemo(() => {
    if (!auctions?.length) return [];
    const map = new Map<string, UpcomingAuction[]>();
    for (const a of auctions) {
      const dateKey = new Date(a.date).toDateString();
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(a);
    }
    return Array.from(map.entries());
  }, [auctions]);

  return (
    <>
      {/* Table header */}
      <div className="shrink-0 grid grid-cols-[52px_28px_1fr_60px_56px_56px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span>{tr(t, 'bacDate', 'Date')}</span>
        <span></span>
        <span>{tr(t, 'bacSecurity', 'Security')}</span>
        <span className="text-right">{tr(t, 'bacAmount', 'Amount')}</span>
        <span className="text-right">{tr(t, 'bacExpYld', 'Exp Yld')}</span>
        <span className="text-right">{tr(t, 'bacWI', 'WI Sprd')}</span>
      </div>

      {auctions.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'bacNoUpcoming', 'No upcoming auctions')}
        </div>
      )}

      {grouped.map(([dateKey, items]) => (
        <div key={dateKey}>
          <div className="sticky top-0 z-10 px-3 py-0.5 text-[8px] font-mono font-black uppercase tracking-widest bg-[#080808] text-green-400/60 border-b border-border/20">
            {fmtDate(items[0].date)}
          </div>
          {items.map((a, i) => {
            const flag = COUNTRY_FLAGS[a.country] ?? '';
            return (
              <div
                key={`${a.date}-${a.security}-${i}`}
                className="grid grid-cols-[52px_28px_1fr_60px_56px_56px] text-[9px] font-mono px-3 py-1 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors items-center"
              >
                <span className="text-neutral-600">{fmtDateShort(a.date)}</span>
                <span className="text-[8px]">{flag}{!flag && a.country}</span>
                <div className="flex items-center gap-1.5 truncate pr-1">
                  <span className="text-white/80">{a.security}</span>
                  <span className="text-[7px] text-green-400/50">{a.tenor}</span>
                </div>
                <span className="text-right text-white/60">${fmtAmt(a.amount)}</span>
                <span className="text-right text-green-300/80">{fmtYield(a.expectedYield)}</span>
                <span className="text-right text-neutral-500">{fmtBps(a.whenIssuedSpread)}</span>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

// ── Section 2: Recent Results ──

function ResultsSection({
  results,
  t,
}: {
  results: RecentResult[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <>
      {/* Table header */}
      <div className="shrink-0 grid grid-cols-[44px_24px_1fr_48px_44px_40px_40px_40px_44px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span>{tr(t, 'bacDate', 'Date')}</span>
        <span></span>
        <span>{tr(t, 'bacSecurity', 'Security')}</span>
        <span className="text-right">{tr(t, 'bacHighYld', 'Yield')}</span>
        <span className="text-right">{tr(t, 'bacBTC', 'B/C')}</span>
        <span className="text-right">{tr(t, 'bacTail', 'Tail')}</span>
        <span className="text-right">{tr(t, 'bacIndirect', 'Ind%')}</span>
        <span className="text-right">{tr(t, 'bacDirect', 'Dir%')}</span>
        <span className="text-right">{tr(t, 'bacStatus', 'Status')}</span>
      </div>

      {results.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'bacNoResults', 'No recent results')}
        </div>
      )}

      {results.map((r, i) => {
        const flag = COUNTRY_FLAGS[r.country] ?? '';
        return (
          <div
            key={`${r.date}-${r.security}-${i}`}
            className="grid grid-cols-[44px_24px_1fr_48px_44px_40px_40px_40px_44px] text-[9px] font-mono px-3 py-1 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-600">{fmtDateShort(r.date)}</span>
            <span className="text-[8px]">{flag}{!flag && r.country}</span>
            <span className="text-white/80 truncate pr-1">{r.security}</span>
            <span className="text-right text-green-300/80">{fmtYield(r.highYield)}</span>
            <span className={`text-right font-bold ${btcColor(r.bidToCover)}`}>
              {r.bidToCover.toFixed(2)}x
            </span>
            <span className={`text-right ${tailColor(r.tail)}`}>
              {r.tail > 0 ? '+' : ''}{r.tail.toFixed(1)}
            </span>
            <span className="text-right text-neutral-400">{fmtPct(r.indirectPct)}</span>
            <span className="text-right text-neutral-400">{fmtPct(r.directPct)}</span>
            <span className={`text-right text-[7px] font-bold uppercase px-1 py-0.5 ${statusColor(r.status)}`}>
              {r.status}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Section 3: Auction Analytics ──

function AnalyticsSection({
  analytics,
  t,
}: {
  analytics: TenorAverage[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bacUSTreasuryAvg', 'US Treasury Auction Averages')}
        </span>
      </div>

      {/* Table header */}
      <div className="shrink-0 grid grid-cols-[56px_52px_44px_48px_48px_40px_44px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span>{tr(t, 'bacTenor', 'Tenor')}</span>
        <span className="text-right">{tr(t, 'bacAvgBTC', 'Avg B/C')}</span>
        <span className="text-right">{tr(t, 'bacAvgTail', 'Avg Tail')}</span>
        <span className="text-right">{tr(t, 'bacAvgInd', 'Avg Ind')}</span>
        <span className="text-right">{tr(t, 'bacAvgDir', 'Avg Dir')}</span>
        <span className="text-right">{tr(t, 'bacTrend', 'Trend')}</span>
        <span className="text-right">{tr(t, 'bacSamples', 'N')}</span>
      </div>

      {analytics.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'bacNoAnalytics', 'No analytics data')}
        </div>
      )}

      {analytics.map((row, i) => (
        <div
          key={row.tenor}
          className={`grid grid-cols-[56px_52px_44px_48px_48px_40px_44px] text-[9px] font-mono px-3 py-1.5 border-b border-border/10 hover:bg-green-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-white font-bold">{row.tenor}</span>
          <span className={`text-right font-bold ${btcColor(row.avgBidToCover)}`}>
            {row.avgBidToCover.toFixed(2)}x
          </span>
          <span className={`text-right ${tailColor(row.avgTail)}`}>
            {row.avgTail > 0 ? '+' : ''}{row.avgTail.toFixed(1)}
          </span>
          <span className="text-right text-neutral-400">{fmtPct(row.avgIndirect)}</span>
          <span className="text-right text-neutral-400">{fmtPct(row.avgDirect)}</span>
          <span className={`text-right font-bold ${trendColor(row.trend)}`}>
            {trendIcon(row.trend)}
          </span>
          <span className="text-right text-neutral-600">{row.sampleSize}</span>
        </div>
      ))}

      {/* Bid-to-cover visual summary */}
      {analytics.length > 0 && (
        <div className="px-3 py-2 border-t border-border/20">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
            {tr(t, 'bacDemandHeatmap', 'Demand Heatmap (Bid-to-Cover)')}
          </div>
          <div className="flex gap-1">
            {analytics.map((row) => {
              const pct = Math.min((row.avgBidToCover / 4) * 100, 100);
              const bg =
                row.avgBidToCover >= 2.8
                  ? 'bg-green-500/40'
                  : row.avgBidToCover >= 2.4
                    ? 'bg-green-500/20'
                    : row.avgBidToCover >= 2.0
                      ? 'bg-yellow-500/20'
                      : 'bg-red-500/20';
              return (
                <div key={row.tenor} className="flex-1">
                  <div className={`h-4 ${bg} flex items-center justify-center`}>
                    <span className="text-[7px] font-mono font-bold text-white/70">
                      {row.avgBidToCover.toFixed(1)}x
                    </span>
                  </div>
                  <div className="text-[6px] font-mono text-neutral-600 text-center mt-0.5">
                    {row.tenor}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

// ── Section 4: Issuance Calendar ──

function IssuanceSection({
  issuance,
  t,
}: {
  issuance: WeeklyIssuance[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/20 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'bacWeeklySupply', 'Weekly Supply / Demand Summary')}
        </span>
      </div>

      {issuance.length === 0 && (
        <div className="text-center py-6 text-neutral-600 text-[9px] font-mono uppercase">
          {tr(t, 'bacNoIssuance', 'No issuance data')}
        </div>
      )}

      {issuance.map((week, wi) => (
        <div key={week.week} className="border-b border-border/20">
          {/* Week header */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#080808] border-b border-border/10">
            <span className="text-[8px] font-mono font-black uppercase tracking-wider text-green-400/60">
              {tr(t, 'bacWeekOf', 'Week of')} {fmtDate(week.week)}
            </span>
            <span className={`text-[8px] font-mono font-bold ${cashFlowColor(week.netCashFlow)}`}>
              {tr(t, 'bacNetCash', 'Net')}: {week.netCashFlow >= 0 ? '+' : ''}${fmtAmt(Math.abs(week.netCashFlow))}
            </span>
          </div>

          {/* Supply/demand metrics */}
          <div className="grid grid-cols-3 gap-px bg-border/10">
            <div className="px-2 py-1.5 bg-black">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'bacTotalSupply', 'Total Supply')}
              </div>
              <div className="text-[10px] font-mono font-bold text-red-400">
                ${fmtAmt(week.totalSupply)}
              </div>
            </div>
            <div className="px-2 py-1.5 bg-black">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'bacSettlement', 'Net Settlement')}
              </div>
              <div className={`text-[10px] font-mono font-bold ${cashFlowColor(-week.netSettlement)}`}>
                ${fmtAmt(week.netSettlement)}
              </div>
            </div>
            <div className="px-2 py-1.5 bg-black">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'bacCoupon', 'Coupon Pmts')}
              </div>
              <div className="text-[10px] font-mono font-bold text-green-400">
                ${fmtAmt(week.couponPayments)}
              </div>
            </div>
          </div>

          {/* Breakdown by tenor */}
          {week.notesBills.length > 0 && (
            <div className="px-3 py-1">
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {week.notesBills.map((nb, nbi) => (
                  <div key={`${nb.tenor}-${nbi}`} className="flex items-center gap-1">
                    <span className="text-[7px] font-mono text-neutral-500">{nb.tenor}:</span>
                    <span className="text-[8px] font-mono text-white/60">${fmtAmt(nb.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Net cash flow bar */}
          <div className="px-3 py-1">
            <div className="h-1.5 bg-white/[0.03] w-full overflow-hidden">
              {week.netCashFlow !== 0 && (
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(Math.abs(week.netCashFlow) / (week.totalSupply || 1) * 100, 100)}%`,
                    backgroundColor: week.netCashFlow >= 0 ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
