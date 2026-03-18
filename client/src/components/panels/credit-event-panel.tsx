import { useCreditEvent } from '../../api/hooks/use-credit-event';
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

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CreditEventData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CreditEvent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CdsAuction = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WatchlistIssuer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DefaultRateSector = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecoveryBySeniority = any;

// ── Formatting helpers ──

function fmtPct(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(1)}%`;
}

function fmtRate(n: number | undefined | null): string {
  if (n == null) return '--';
  return `${n.toFixed(2)}%`;
}

function fmtNotional(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtSpread(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtDtd(n: number | undefined | null): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

// ── Color helpers ──

function eventTypeColor(type: string | undefined): string {
  if (!type) return 'text-neutral-500';
  const t = type.toLowerCase();
  if (t.includes('bankruptcy') || t.includes('default')) return 'text-red-400';
  if (t.includes('restructuring') || t.includes('distress')) return 'text-orange-400';
  if (t.includes('downgrade') || t.includes('missed')) return 'text-yellow-400';
  if (t.includes('succession') || t.includes('merger')) return 'text-blue-400';
  return 'text-neutral-400';
}

function eventTypeBg(type: string | undefined): string {
  if (!type) return 'bg-neutral-500/10';
  const t = type.toLowerCase();
  if (t.includes('bankruptcy') || t.includes('default')) return 'bg-red-500/10';
  if (t.includes('restructuring') || t.includes('distress')) return 'bg-orange-500/10';
  if (t.includes('downgrade') || t.includes('missed')) return 'bg-yellow-500/10';
  if (t.includes('succession') || t.includes('merger')) return 'bg-blue-500/10';
  return 'bg-neutral-500/10';
}

function auctionStatusColor(status: string | undefined): string {
  if (!status) return 'text-neutral-600';
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'settled') return 'text-green-400';
  if (s === 'pending' || s === 'scheduled') return 'text-amber-400';
  if (s === 'cancelled' || s === 'failed') return 'text-red-400';
  return 'text-neutral-500';
}

function riskColor(pd: number | undefined | null): string {
  if (pd == null) return 'text-neutral-500';
  if (pd >= 10) return 'text-red-400';
  if (pd >= 5) return 'text-orange-400';
  if (pd >= 2) return 'text-yellow-400';
  return 'text-neutral-400';
}

function riskRowBg(pd: number | undefined | null): string {
  if (pd == null) return '';
  if (pd >= 10) return 'bg-red-500/[0.03]';
  if (pd >= 5) return 'bg-orange-500/[0.02]';
  return '';
}

function ratingColor(rating: string | undefined): string {
  if (!rating) return 'text-neutral-500';
  if (rating.startsWith('CCC') || rating.startsWith('CC') || rating.startsWith('C') || rating.startsWith('D'))
    return 'text-red-400';
  if (rating.startsWith('B') && !rating.startsWith('BB')) return 'text-orange-400';
  if (rating.startsWith('BB')) return 'text-yellow-400';
  if (rating.startsWith('BBB')) return 'text-neutral-300';
  return 'text-green-400';
}

function defaultRateColor(rate: number | undefined | null): string {
  if (rate == null) return 'text-neutral-700';
  if (rate >= 5) return 'text-red-400';
  if (rate >= 2) return 'text-orange-400';
  if (rate >= 1) return 'text-yellow-400';
  if (rate >= 0.5) return 'text-neutral-400';
  return 'text-neutral-600';
}

function recoveryBarColor(seniority: string | undefined): string {
  if (!seniority) return 'bg-amber-400/60';
  const s = seniority.toLowerCase();
  if (s.includes('senior secured') || s.includes('1st lien')) return 'bg-green-400/70';
  if (s.includes('senior unsecured')) return 'bg-amber-400/60';
  if (s.includes('subordinated') || s.includes('junior')) return 'bg-orange-400/60';
  if (s.includes('equity') || s.includes('preferred')) return 'bg-red-400/60';
  return 'bg-amber-400/60';
}

// ── Main Panel ──

export function CreditEventPanel() {
  const t = useT();
  const { data, isLoading, error } = useCreditEvent();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'panelCreditEvent', 'Credit Event Tracker')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.summary?.distressedRatio != null && (
            <span
              className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 border ${
                data.summary.distressedRatio >= 10
                  ? 'text-red-400 bg-red-500/10 border-red-500/30'
                  : data.summary.distressedRatio >= 5
                    ? 'text-orange-400 bg-orange-500/10 border-orange-500/30'
                    : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}
            >
              DISTRESSED {fmtPct(data.summary.distressedRatio)}
            </span>
          )}
          {isLoading && (
            <RefreshCw className="w-3 h-3 text-amber-400/40 animate-spin" />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'error', 'Error loading data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'ceNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryStats data={data} t={t} />
            <RecentEventsTable events={data?.recentEvents} t={t} />
            <AuctionCalendar auctions={data?.auctionCalendar} t={t} />
            <WatchlistSection issuers={data?.watchlist} t={t} />
            <DefaultRatesGrid sectors={data?.defaultRates} t={t} />
            <RecoveryRatesSection recoveries={data?.recoveryBySeniority} t={t} />
            <DistressedTrend trend={data?.distressedTrend} timestamp={data?.timestamp} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Stats ──

function SummaryStats({
  data,
  t,
}: {
  data: CreditEventData;
  t: ReturnType<typeof useT>;
}) {
  const summary = data?.summary;

  const stats = [
    {
      label: tr(t, 'ceEvents30d', 'Events (30d)'),
      value: summary?.totalEvents30d ?? '--',
      color: 'text-white',
    },
    {
      label: tr(t, 'ceAvgRecovery', 'Avg Recovery'),
      value: fmtPct(summary?.avgRecoveryRate),
      color: 'text-amber-400',
    },
    {
      label: tr(t, 'ceDistressedRatio', 'Distressed Ratio'),
      value: fmtPct(summary?.distressedRatio),
      color: summary?.distressedRatio >= 10 ? 'text-red-400' : summary?.distressedRatio >= 5 ? 'text-orange-400' : 'text-amber-400',
    },
    {
      label: tr(t, 'ceCdsAuctionsPending', 'CDS Auctions Pending'),
      value: summary?.cdsAuctionsPending ?? '--',
      color: summary?.cdsAuctionsPending > 0 ? 'text-amber-400' : 'text-neutral-400',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {stats.map((s) => (
          <div key={s.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">
              {s.label}
            </div>
            <div className={`text-[11px] font-mono font-black ${s.color}`}>
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Events Table ──

function RecentEventsTable({
  events,
  t,
}: {
  events: CreditEvent[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!events?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceRecentEvents', 'Recent Credit Events')}
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[60px_1fr_80px_56px_56px_72px] gap-px px-2 py-1 bg-[#060606] border-b border-border/10">
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">DATE</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">ENTITY</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">TYPE</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">RECOVERY</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">NOT $M</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">CDS AUCTION</span>
      </div>

      {events.map((evt: CreditEvent, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[60px_1fr_80px_56px_56px_72px] gap-px px-2 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {evt?.date?.slice?.(5) ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-200 truncate font-bold">
            {evt?.entity ?? '--'}
          </span>
          <span className={`text-[7px] font-mono font-bold uppercase truncate px-1 py-px ${eventTypeColor(evt?.type)} ${eventTypeBg(evt?.type)}`}>
            {evt?.type ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-amber-400 text-right">
            {fmtPct(evt?.recoveryRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNotional(evt?.notionalMM)}
          </span>
          <span className={`text-[7px] font-mono font-bold text-right uppercase ${auctionStatusColor(evt?.cdsAuctionStatus)}`}>
            {evt?.cdsAuctionStatus ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── CDS Auction Calendar ──

function AuctionCalendar({
  auctions,
  t,
}: {
  auctions: CdsAuction[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!auctions?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceCdsAuctionCalendar', 'CDS Auction Calendar')}
        </span>
      </div>

      <div className="grid grid-cols-[60px_1fr_80px_60px_72px] gap-px px-2 py-1 bg-[#060606] border-b border-border/10">
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">DATE</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">ENTITY</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">PROTOCOL</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">NOT $M</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">STATUS</span>
      </div>

      {auctions.map((auc: CdsAuction, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[60px_1fr_80px_60px_72px] gap-px px-2 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {auc?.date?.slice?.(5) ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-200 truncate font-bold">
            {auc?.entity ?? '--'}
          </span>
          <span className="text-[7px] font-mono text-neutral-500 truncate">
            {auc?.protocol ?? '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNotional(auc?.notionalMM)}
          </span>
          <span className={`text-[7px] font-mono font-bold text-right uppercase ${auctionStatusColor(auc?.status)}`}>
            {auc?.status ?? '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Watchlist Section ──

function WatchlistSection({
  issuers,
  t,
}: {
  issuers: WatchlistIssuer[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!issuers?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceWatchlist', 'Credit Watchlist')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_56px_48px_48px_48px_40px] gap-px px-2 py-1 bg-[#060606] border-b border-border/10">
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">ISSUER</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">CDS SPR</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">PD 1Y</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">PD 5Y</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">DTD</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">RTG</span>
      </div>

      {issuers.map((iss: WatchlistIssuer, i: number) => {
        const pd1y = iss?.pd1y;
        const pd5y = iss?.pd5y;
        const maxPd = Math.max(pd1y ?? 0, pd5y ?? 0);
        return (
          <div
            key={i}
            className={`grid grid-cols-[1fr_56px_48px_48px_48px_40px] gap-px px-2 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors ${riskRowBg(maxPd)}`}
          >
            <span className="text-[8px] font-mono text-neutral-200 truncate font-bold">
              {iss?.name ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-amber-400 text-right">
              {fmtSpread(iss?.cdsSpread)}
            </span>
            <span className={`text-[8px] font-mono text-right ${riskColor(pd1y)}`}>
              {fmtRate(pd1y)}
            </span>
            <span className={`text-[8px] font-mono text-right ${riskColor(pd5y)}`}>
              {fmtRate(pd5y)}
            </span>
            <span className={`text-[8px] font-mono text-right ${
              (iss?.distanceToDefault ?? 99) < 2 ? 'text-red-400' : (iss?.distanceToDefault ?? 99) < 4 ? 'text-yellow-400' : 'text-neutral-400'
            }`}>
              {fmtDtd(iss?.distanceToDefault)}
            </span>
            <span className={`text-[7px] font-mono font-bold text-right ${ratingColor(iss?.rating)}`}>
              {iss?.rating ?? '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Default Rates Grid (Sector vs IG/HY) ──

function DefaultRatesGrid({
  sectors,
  t,
}: {
  sectors: DefaultRateSector[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!sectors?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceDefaultRates', 'Default Rates — Sector x IG/HY')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-px px-2 py-1 bg-[#060606] border-b border-border/10">
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600">SECTOR</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">IG 1Y</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">IG 5Y</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">HY 1Y</span>
        <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 text-right">HY 5Y</span>
      </div>

      {sectors.map((sec: DefaultRateSector, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_48px_48px_48px_48px] gap-px px-2 py-0.5 border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors"
        >
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {sec?.sector ?? '--'}
          </span>
          <span className={`text-[8px] font-mono text-right ${defaultRateColor(sec?.ig1y)}`}>
            {fmtRate(sec?.ig1y)}
          </span>
          <span className={`text-[8px] font-mono text-right ${defaultRateColor(sec?.ig5y)}`}>
            {fmtRate(sec?.ig5y)}
          </span>
          <span className={`text-[8px] font-mono text-right ${defaultRateColor(sec?.hy1y)}`}>
            {fmtRate(sec?.hy1y)}
          </span>
          <span className={`text-[8px] font-mono text-right ${defaultRateColor(sec?.hy5y)}`}>
            {fmtRate(sec?.hy5y)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Recovery Rates by Seniority ──

function RecoveryRatesSection({
  recoveries,
  t,
}: {
  recoveries: RecoveryBySeniority[] | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!recoveries?.length) return null;

  const maxRate = Math.max(...recoveries.map((r: RecoveryBySeniority) => r?.rate ?? 0), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceRecoveryBySeniority', 'Recovery Rates by Seniority')}
        </span>
      </div>

      <div className="px-3 py-1.5 space-y-1">
        {recoveries.map((rec: RecoveryBySeniority, i: number) => {
          const pct = maxRate > 0 ? ((rec?.rate ?? 0) / maxRate) * 100 : 0;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[7px] font-mono text-neutral-500 w-24 truncate uppercase tracking-wider">
                {rec?.seniority ?? '--'}
              </span>
              <div className="flex-1 h-2 bg-neutral-900 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${recoveryBarColor(rec?.seniority)}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-amber-400 w-10 text-right font-bold">
                {fmtPct(rec?.rate)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Distressed Ratio Trend (Sparkline-style text) ──

function DistressedTrend({
  trend,
  timestamp,
  t,
}: {
  trend: number[] | undefined;
  timestamp: string | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!trend?.length) return null;

  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;

  // Map values to sparkline block characters
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

  const sparkline = trend.map((v: number) => {
    const idx = Math.min(Math.floor(((v - min) / range) * (blocks.length - 1)), blocks.length - 1);
    return blocks[idx];
  });

  const latest = trend[trend.length - 1];
  const prev = trend.length >= 2 ? trend[trend.length - 2] : latest;
  const delta = latest - prev;

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'ceDistressedTrend', 'Distressed Ratio Trend (12M)')}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono font-bold text-white">
            {fmtPct(latest)}
          </span>
          <span className={`text-[7px] font-mono font-bold ${delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-neutral-500'}`}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)}pp
          </span>
        </div>
      </div>

      <div className="flex items-end gap-px">
        {sparkline.map((block: string, i: number) => {
          const v = trend[i];
          const intensity = (v - min) / range;
          return (
            <span
              key={i}
              className="text-[11px] font-mono leading-none"
              style={{
                color: intensity > 0.7
                  ? '#f87171'
                  : intensity > 0.4
                    ? '#fbbf24'
                    : '#525252',
              }}
              title={`${fmtPct(v)}`}
            >
              {block}
            </span>
          );
        })}
      </div>

      <div className="flex justify-between mt-0.5">
        <span className="text-[6px] font-mono text-neutral-700">
          {tr(t, 'ce12mAgo', '12M AGO')}
        </span>
        <span className="text-[6px] font-mono text-neutral-700">
          {tr(t, 'ceNow', 'NOW')}
        </span>
      </div>

      {/* Timestamp */}
      {timestamp && (
        <div className="mt-1.5 pt-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'ceLastUpdate', 'Last update')}: {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
