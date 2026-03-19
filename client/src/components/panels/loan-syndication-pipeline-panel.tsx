import { useState } from 'react';
import { useLoanSyndicationPipeline } from '../../api/hooks/use-loan-syndication-pipeline';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n helper with fallback
type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

type Tab = 'pipeline' | 'recentlyPriced' | 'marketColor' | 'calendar';

const TABS: { key: Tab; label: string }[] = [
  { key: 'pipeline', label: 'PIPELINE' },
  { key: 'recentlyPriced', label: 'RECENTLY PRICED' },
  { key: 'marketColor', label: 'MARKET COLOR' },
  { key: 'calendar', label: 'CALENDAR' },
];

// ── Formatting helpers ──

function fmtSize(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(0) + 'bp';
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2) + '%';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2);
}

function fmtChg(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return sign + n.toFixed(0) + 'bp';
}

function fmtLev(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1) + 'x';
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function statusBadge(status: string | null | undefined): { text: string; cls: string } {
  const s = (status ?? '').toUpperCase();
  switch (s) {
    case 'LAUNCHED':
      return { text: 'LAUNCHED', cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
    case 'PRICED':
      return { text: 'PRICED', cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
    case 'ALLOCATED':
      return { text: 'ALLOCATED', cls: 'text-blue-400 bg-blue-500/10 border border-blue-500/30' };
    case 'CLOSED':
      return { text: 'CLOSED', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/30' };
    default:
      return { text: s || '-', cls: 'text-neutral-500 bg-neutral-500/10 border border-neutral-500/20' };
  }
}

function ratingBadge(rating: string | null | undefined): { text: string; cls: string } {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('BB') || r.startsWith('BA'))
    return { text: r, cls: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' };
  if (r.startsWith('B') && !r.startsWith('BB') && !r.startsWith('BA'))
    return { text: r, cls: 'text-orange-400 bg-orange-500/10 border border-orange-500/30' };
  if (r.startsWith('CCC') || r.startsWith('CAA'))
    return { text: r, cls: 'text-red-400 bg-red-500/10 border border-red-500/30' };
  if (r.startsWith('A') || r.startsWith('BBB') || r.startsWith('BAA'))
    return { text: r, cls: 'text-green-400 bg-green-500/10 border border-green-500/30' };
  return { text: r || '-', cls: 'text-neutral-400 bg-neutral-500/10 border border-neutral-500/20' };
}

// ── Shimmer skeleton row ──

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-border/20">
          <div className="h-2 bg-white/5 animate-pulse flex-[2]" />
          <div className="h-2 bg-white/5 animate-pulse flex-1" />
          <div className="h-2 bg-white/5 animate-pulse w-12" />
          <div className="h-2 bg-white/5 animate-pulse w-10" />
          <div className="h-2 bg-white/5 animate-pulse w-14" />
        </div>
      ))}
    </>
  );
}

// ── Stats bar ──

function StatsBar({ stats }: { stats: Record<string, unknown> }) {
  const items = [
    { label: 'TOTAL VOLUME', value: fmtSize(stats.totalVolume as number) },
    { label: 'DEAL COUNT', value: stats.dealCount != null ? String(stats.dealCount) : '-' },
    { label: 'AVG SPREAD', value: fmtBps(stats.avgSpread as number) },
    { label: 'AVG OID', value: fmtPrice(stats.avgOid as number) },
    { label: 'OVERSUBSCRIPTION', value: stats.oversubscription != null ? fmtLev(stats.oversubscription as number) : '-' },
  ];

  return (
    <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div
          key={item.label}
          className="px-2 py-1.5 border-r border-border/10 last:border-r-0 bg-cyan-400/[0.03]"
        >
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider leading-tight">
            {item.label}
          </div>
          <div className="text-[10px] font-mono font-bold text-white leading-tight tabular-nums">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Pipeline Tab ──

function PipelineTab({ deals, t }: { deals: Array<Record<string, unknown>>; t: TFn }) {
  if (!deals.length) {
    return (
      <div className="flex items-center justify-center h-24 text-[8px] text-white/20 uppercase tracking-wider font-mono">
        {tr(t, 'lspNoPipeline', 'No deals in pipeline')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_70px_50px_50px_50px_50px_40px_55px] gap-px px-3 py-1 border-b border-border/20 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'lspBorrower', 'Borrower')}</span>
        <span>{tr(t, 'lspArranger', 'Arranger')}</span>
        <span className="text-right">{tr(t, 'lspSize', 'Size')}</span>
        <span className="text-right">{tr(t, 'lspSpread', 'Spread')}</span>
        <span className="text-right">{tr(t, 'lspOid', 'OID')}</span>
        <span className="text-right">{tr(t, 'lspTenor', 'Tenor')}</span>
        <span className="text-center">{tr(t, 'lspRating', 'Rtg')}</span>
        <span className="text-center">{tr(t, 'lspStatus', 'Status')}</span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => {
        const sb = statusBadge(deal.status as string);
        const rb = ratingBadge(deal.rating as string);
        return (
          <div
            key={`${String(deal.borrower ?? '')}-${i}`}
            className="grid grid-cols-[1fr_70px_50px_50px_50px_50px_40px_55px] gap-px px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-cyan-400 truncate">
              {String(deal.borrower ?? '-')}
            </span>
            <span className="text-[8px] text-neutral-400 truncate">
              {String(deal.arranger ?? deal.leadArranger ?? '-')}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtSize(deal.size as number)}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtBps(deal.spread as number)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right tabular-nums">
              {fmtPrice(deal.oid as number)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right">
              {deal.tenor ? String(deal.tenor) : '-'}
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[6px] font-bold ${rb.cls}`}>
                {rb.text}
              </span>
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[6px] font-bold uppercase ${sb.cls}`}>
                {sb.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Recently Priced Tab ──

function RecentlyPricedTab({ deals, t }: { deals: Array<Record<string, unknown>>; t: TFn }) {
  if (!deals.length) {
    return (
      <div className="flex items-center justify-center h-24 text-[8px] text-white/20 uppercase tracking-wider font-mono">
        {tr(t, 'lspNoRecentlyPriced', 'No recently priced deals')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_50px_50px_50px_50px_55px_55px_50px] gap-px px-3 py-1 border-b border-border/20 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'lspBorrower', 'Borrower')}</span>
        <span className="text-right">{tr(t, 'lspSize', 'Size')}</span>
        <span className="text-right">{tr(t, 'lspSpread', 'Spread')}</span>
        <span className="text-right">{tr(t, 'lspOid', 'OID')}</span>
        <span className="text-right">{tr(t, 'lspYield', 'Yield')}</span>
        <span className="text-right">{tr(t, 'lspOversubscribed', 'Oversub')}</span>
        <span className="text-right">{tr(t, 'lspPriceDate', 'Priced')}</span>
        <span className="text-center">{tr(t, 'lspRating', 'Rtg')}</span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => {
        const rb = ratingBadge(deal.rating as string);
        return (
          <div
            key={`${String(deal.borrower ?? '')}-${i}`}
            className="grid grid-cols-[1fr_50px_50px_50px_50px_55px_55px_50px] gap-px px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-cyan-400 truncate">
              {String(deal.borrower ?? '-')}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtSize(deal.size as number)}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtBps(deal.spread as number)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right tabular-nums">
              {fmtPrice(deal.oid as number)}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtPct(deal.yield as number)}
            </span>
            <span className="text-[8px] text-neutral-400 text-right tabular-nums">
              {deal.oversubscription ? fmtLev(deal.oversubscription as number) : '-'}
            </span>
            <span className="text-[8px] text-neutral-400 text-right">
              {deal.pricedDate ? String(deal.pricedDate) : '-'}
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[6px] font-bold ${rb.cls}`}>
                {rb.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Market Color Tab ──

function MarketColorTab({ entries, t }: { entries: Array<Record<string, unknown>>; t: TFn }) {
  if (!entries.length) {
    return (
      <div className="flex items-center justify-center h-24 text-[8px] text-white/20 uppercase tracking-wider font-mono">
        {tr(t, 'lspNoMarketColor', 'No market color data')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-px px-3 py-1 border-b border-border/20 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'lspSegment', 'Segment')}</span>
        <span className="text-right">{tr(t, 'lspAvgSpread', 'Avg Spd')}</span>
        <span className="text-right">{tr(t, 'lspSpreadChg', 'Chg 1W')}</span>
        <span className="text-right">{tr(t, 'lspAvgPrice', 'Avg Px')}</span>
        <span className="text-right">{tr(t, 'lspNewIssVol', 'New Iss')}</span>
        <span className="text-right">{tr(t, 'lspTechnicalsLabel', 'Tone')}</span>
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div
          key={`${String(entry.segment ?? entry.name ?? '')}-${i}`}
          className="grid grid-cols-[1fr_55px_55px_55px_55px_55px] gap-px px-3 py-1.5 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-cyan-400 truncate">
            {String(entry.segment ?? entry.name ?? '-')}
          </span>
          <span className="text-[8px] text-white text-right tabular-nums">
            {fmtBps(entry.avgSpread as number)}
          </span>
          <span className={`text-[8px] text-right tabular-nums font-bold ${changeColor(entry.spreadChg as number)}`}>
            {fmtChg(entry.spreadChg as number)}
          </span>
          <span className="text-[8px] text-white text-right tabular-nums">
            {fmtPrice(entry.avgPrice as number)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right tabular-nums">
            {fmtSize(entry.newIssueVolume as number)}
          </span>
          <span className="text-[8px] text-right">
            {entry.tone ? (
              <span className={`inline-block px-1 py-px text-[6px] font-bold uppercase ${
                String(entry.tone).toLowerCase() === 'strong' ? 'text-green-400 bg-green-500/10 border border-green-500/30' :
                String(entry.tone).toLowerCase() === 'weak' ? 'text-red-400 bg-red-500/10 border border-red-500/30' :
                String(entry.tone).toLowerCase() === 'mixed' ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30' :
                'text-neutral-400 bg-neutral-500/10 border border-neutral-500/20'
              }`}>
                {String(entry.tone)}
              </span>
            ) : (
              <span className="text-neutral-500">-</span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Calendar Tab ──

function CalendarTab({ events, t }: { events: Array<Record<string, unknown>>; t: TFn }) {
  if (!events.length) {
    return (
      <div className="flex items-center justify-center h-24 text-[8px] text-white/20 uppercase tracking-wider font-mono">
        {tr(t, 'lspNoCalendar', 'No upcoming events')}
      </div>
    );
  }

  return (
    <div>
      {/* Table header */}
      <div className="grid grid-cols-[60px_1fr_55px_55px_55px_55px] gap-px px-3 py-1 border-b border-border/20 text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider sticky top-0 bg-black z-10">
        <span>{tr(t, 'lspDate', 'Date')}</span>
        <span>{tr(t, 'lspBorrower', 'Borrower')}</span>
        <span className="text-right">{tr(t, 'lspSize', 'Size')}</span>
        <span className="text-right">{tr(t, 'lspSpread', 'Spread')}</span>
        <span className="text-center">{tr(t, 'lspRating', 'Rtg')}</span>
        <span className="text-center">{tr(t, 'lspEvent', 'Event')}</span>
      </div>

      {/* Rows */}
      {events.map((event, i) => {
        const rb = ratingBadge(event.rating as string);
        const sb = statusBadge(event.eventType as string ?? event.status as string);
        return (
          <div
            key={`${String(event.date ?? '')}-${String(event.borrower ?? '')}-${i}`}
            className="grid grid-cols-[60px_1fr_55px_55px_55px_55px] gap-px px-3 py-1 border-b border-border/20 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] text-neutral-400 tabular-nums">
              {event.date ? String(event.date) : '-'}
            </span>
            <span className="text-[8px] font-bold text-cyan-400 truncate">
              {String(event.borrower ?? '-')}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtSize(event.size as number)}
            </span>
            <span className="text-[8px] text-white text-right tabular-nums">
              {fmtBps(event.spread as number)}
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[6px] font-bold ${rb.cls}`}>
                {rb.text}
              </span>
            </span>
            <span className="text-center">
              <span className={`inline-block px-1 py-px text-[6px] font-bold uppercase ${sb.cls}`}>
                {sb.text}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Panel ──

export function LoanSyndicationPipelinePanel() {
  const t = useT();
  const [tab, setTab] = useState<Tab>('pipeline');
  const { data, isLoading, error, refetch } = useLoanSyndicationPipeline();

  // ── Error state ──
  if (error && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'lspTitle', 'Loan Syndication Pipeline')}
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-[9px] text-red-400 uppercase tracking-wider">
            {tr(t, 'lspError', 'Failed to load pipeline data')}
          </span>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 text-[8px] font-mono font-bold uppercase tracking-wider text-cyan-400 border border-cyan-400/30 bg-cyan-400/5 hover:bg-cyan-400/10 transition-colors"
          >
            {tr(t, 'lspRetry', 'Retry')}
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state (skeleton) ──
  if (isLoading && !data) {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'lspTitle', 'Loan Syndication Pipeline')}
          </span>
        </div>
        {/* Shimmer stat boxes */}
        <div className="grid grid-cols-5 border-b border-border/20 shrink-0">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-2 py-1.5 border-r border-border/10 last:border-r-0 bg-cyan-400/[0.03]">
              <div className="h-2 w-12 bg-white/5 animate-pulse mb-1" />
              <div className="h-3 w-16 bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Shimmer tab bar */}
        <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 shrink-0">
          {TABS.map((tb) => (
            <div key={tb.key} className="px-2 py-0.5">
              <div className="h-2 w-14 bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
        {/* Shimmer rows */}
        <div className="flex-1 overflow-hidden">
          <SkeletonRows count={10} />
        </div>
      </div>
    );
  }

  const pipeline = (data?.pipeline ?? []) as Array<Record<string, unknown>>;
  const stats = (data?.stats ?? {}) as Record<string, unknown>;
  const recentlyPriced = (data?.recentlyPriced ?? []) as Array<Record<string, unknown>>;
  const marketColor = (data?.marketColor ?? []) as Array<Record<string, unknown>>;
  const calendar = (data?.calendar ?? []) as Array<Record<string, unknown>>;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'lspTitle', 'Loan Syndication Pipeline')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── Stats Bar ── */}
      {data?.stats ? <StatsBar stats={stats} /> : null}

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 shrink-0 bg-black/40">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wider transition-all ${
              tab === tb.key
                ? 'text-cyan-400 bg-cyan-400/10'
                : 'text-neutral-500 hover:text-white hover:bg-white/[0.02]'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {tab === 'pipeline' ? (
          <PipelineTab deals={pipeline} t={t} />
        ) : tab === 'recentlyPriced' ? (
          <RecentlyPricedTab deals={recentlyPriced} t={t} />
        ) : tab === 'marketColor' ? (
          <MarketColorTab entries={marketColor} t={t} />
        ) : (
          <CalendarTab events={calendar} t={t} />
        )}
      </div>
    </div>
  );
}
