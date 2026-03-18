import { useIpoCalendar } from '../../api/hooks/use-ipo-calendar';
import { useT } from '../../i18n';

// ── Formatting helpers ──

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtPrice(n: number | null): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function fmtMoney(n: number | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toFixed(0)}`;
}

function fmtShares(n: number | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n}`;
}

function fmtDate(d: string | null): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function returnColor(n: number | null): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function statusBadge(status: string | null): { label: string; cls: string } {
  switch (status?.toLowerCase()) {
    case 'filed':
      return { label: 'FILED', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' };
    case 'priced':
      return { label: 'PRICED', cls: 'text-green-400 bg-green-500/10 border-green-500/30' };
    case 'expected':
      return { label: 'EXPECTED', cls: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    case 'withdrawn':
      return { label: 'WITHDRAWN', cls: 'text-red-400 bg-red-500/10 border-red-500/30' };
    case 'postponed':
      return { label: 'POSTPONED', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/30' };
    default:
      return { label: status?.toUpperCase() ?? '--', cls: 'text-neutral/40 bg-white/5 border-border/20' };
  }
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-white/[0.02] border-b border-border/20">
      <span className="text-[9px] font-mono font-bold text-pink-400 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ── Section 1: Upcoming IPOs ──

function UpcomingIpos({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        NO UPCOMING IPOS
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">COMPANY</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">TICKER</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EXCH</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SECTOR</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">PRICE RANGE</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SHARES</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">VALUATION</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EXP DATE</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">STATUS</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const badge = statusBadge(e.status);
            const priceRange = e.priceRangeLow != null && e.priceRangeHigh != null
              ? `$${e.priceRangeLow}-${e.priceRangeHigh}`
              : e.priceRange ?? '--';

            return (
              <tr
                key={`upcoming-${e.ticker ?? e.symbol ?? e.company}-${i}`}
                className="border-b border-border/10 hover:bg-pink-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-neutral/70 truncate max-w-[120px]">
                  {e.company ?? e.name ?? '--'}
                </td>
                <td className="px-1.5 py-1 font-bold text-pink-400">
                  {e.ticker ?? e.symbol ?? '--'}
                </td>
                <td className="px-1.5 py-1 text-neutral/50">{e.exchange ?? '--'}</td>
                <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[80px]">{e.sector ?? '--'}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{priceRange}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtShares(e.sharesOffered ?? e.shares ?? null)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtMoney(e.valuation ?? e.marketCap ?? null)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 whitespace-nowrap">{fmtDate(e.expectedDate ?? e.date ?? null)}</td>
                <td className="text-center px-1.5 py-1">
                  <span className={`text-[7px] px-1.5 py-0.5 font-black border ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {/* Lead underwriters */}
      {items.some((e: any) => e.leadUnderwriters || e.underwriters) && (
        <div className="px-2 py-1 border-t border-border/10">
          {items.filter((e: any) => e.leadUnderwriters || e.underwriters).slice(0, 5).map((e: any, i: number) => (
            <div key={`uw-${i}`} className="flex items-center gap-1 text-[8px] text-neutral/30">
              <span className="text-pink-400/60 font-bold">{e.ticker ?? e.symbol}</span>
              <span className="text-neutral/20">|</span>
              <span className="truncate">{(e.leadUnderwriters ?? e.underwriters ?? []).join(', ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section 2: Recently Priced ──

function RecentlyPriced({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        NO RECENTLY PRICED IPOS
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">TICKER</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">COMPANY</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">IPO PRICE</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">CURRENT</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">1D RTN</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">TOTAL RTN</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">DATE</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">MKT CAP</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const dayReturn = e.oneDayReturn ?? e.firstDayReturn ?? e.dayReturn ?? null;
            const totalReturn = e.totalReturn ?? e.returnFromIPO ?? e.changeFromIPO ?? null;

            return (
              <tr
                key={`recent-${e.ticker ?? e.symbol}-${i}`}
                className="border-b border-border/10 hover:bg-pink-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-pink-400">{e.ticker ?? e.symbol ?? '--'}</td>
                <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[100px]">{e.company ?? e.name ?? '--'}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtPrice(e.ipoPrice ?? e.offerPrice ?? null)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/70 tabular-nums font-bold">{fmtPrice(e.currentPrice ?? e.price ?? null)}</td>
                <td className={`text-right px-1.5 py-1 tabular-nums font-bold ${returnColor(dayReturn)}`}>
                  {fmtPct(dayReturn)}
                </td>
                <td className={`text-right px-1.5 py-1 tabular-nums font-bold ${returnColor(totalReturn)}`}>
                  {fmtPct(totalReturn)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50 whitespace-nowrap">{fmtDate(e.date ?? e.ipoDate ?? null)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtMoney(e.marketCap ?? e.valuation ?? null)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 3: Market Performance ──

function MarketPerformance({ stats }: { stats: any }) {
  if (!stats) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        NO PERFORMANCE DATA
      </div>
    );
  }

  const items = [
    { label: 'TOTAL IPOS YTD', value: stats.totalIpos ?? stats.total ?? '--' },
    { label: 'TOTAL PROCEEDS', value: fmtMoney(stats.totalProceeds ?? stats.proceeds ?? null) },
    { label: 'AVG FIRST DAY RETURN', value: fmtPct(stats.avgFirstDayReturn ?? stats.avgFirstDay ?? null), color: returnColor(stats.avgFirstDayReturn ?? stats.avgFirstDay ?? null) },
    { label: 'AVG RETURN FROM IPO', value: fmtPct(stats.avgReturnFromIPO ?? stats.avgReturn ?? null), color: returnColor(stats.avgReturnFromIPO ?? stats.avgReturn ?? null) },
    { label: '% POSITIVE', value: stats.pctPositive != null ? `${stats.pctPositive.toFixed(1)}%` : (stats.positiveRate != null ? `${stats.positiveRate.toFixed(1)}%` : '--') },
    { label: 'LARGEST IPO', value: stats.largestIPO ?? stats.largest ?? '--' },
  ];

  return (
    <div className="grid grid-cols-3 gap-px p-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-white/[0.02] border border-border/20 px-2 py-1.5 hover:bg-pink-400/[0.02] transition-colors"
        >
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">
            {item.label}
          </div>
          <div className={`text-[11px] font-mono font-bold tabular-nums ${item.color ?? 'text-neutral/80'}`}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section 4: Sector Breakdown ──

function SectorBreakdown({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        NO SECTOR DATA
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">SECTOR</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">COUNT</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">TOTAL PROCEEDS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">AVG RETURN</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">BEST PERFORMER</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s: any, i: number) => {
            const avgReturn = s.avgReturn ?? s.averageReturn ?? null;

            return (
              <tr
                key={`sector-${s.sector ?? s.name}-${i}`}
                className="border-b border-border/10 hover:bg-pink-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-neutral/70 uppercase">{s.sector ?? s.name ?? '--'}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{s.count ?? s.total ?? '--'}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtMoney(s.totalProceeds ?? s.proceeds ?? null)}</td>
                <td className={`text-right px-1.5 py-1 font-bold tabular-nums ${returnColor(avgReturn)}`}>
                  {fmtPct(avgReturn)}
                </td>
                <td className="px-1.5 py-1 text-pink-400/80 truncate max-w-[100px]">
                  {s.bestPerformer ?? s.topPerformer ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 5: Pipeline (S-1 Filers) ──

function Pipeline({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        NO PIPELINE DATA
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">COMPANY</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">FILING DATE</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SECTOR</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EST SIZE</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => (
            <tr
              key={`pipeline-${e.company ?? e.name}-${i}`}
              className="border-b border-border/10 hover:bg-pink-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1 text-neutral/70">{e.company ?? e.name ?? '--'}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50 whitespace-nowrap">{fmtDate(e.filingDate ?? e.date ?? null)}</td>
              <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[80px]">{e.sector ?? '--'}</td>
              <td className="text-right px-1.5 py-1 text-neutral/60 tabular-nums">{fmtMoney(e.estimatedSize ?? e.size ?? e.amount ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function IPOPanel() {
  const t = useT();
  const { data, isLoading, error } = useIpoCalendar();
  const d = data as any;

  if (isLoading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-wider">
          {t('loading')}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
          FAILED TO LOAD
        </span>
      </div>
    );
  }

  const upcomingItems: any[] = d?.upcoming ?? d?.upcomingIpos ?? [];
  const recentItems: any[] = d?.recentlyPriced ?? d?.recent ?? d?.priced ?? [];
  const performanceStats: any = d?.marketPerformance ?? d?.performance ?? d?.stats ?? null;
  const sectorItems: any[] = d?.sectorBreakdown ?? d?.sectors ?? [];
  const pipelineItems: any[] = d?.pipeline ?? d?.filings ?? d?.s1Filers ?? [];

  return (
    <div className="h-full bg-black text-[9px] font-mono overflow-y-auto">
      {/* ── Header ── */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-black sticky top-0 z-10">
        <span className="text-[10px] font-mono font-bold text-pink-400 uppercase tracking-wider">
          {t('panelIpoCalendar' as any) || 'IPO CALENDAR'}
        </span>
      </div>

      {/* ── Section 1: Upcoming IPOs ── */}
      <SectionHeader title="UPCOMING IPOS" />
      <UpcomingIpos items={upcomingItems} />

      {/* ── Section 2: Recently Priced ── */}
      <SectionHeader title="RECENTLY PRICED" />
      <RecentlyPriced items={recentItems} />

      {/* ── Section 3: Market Performance ── */}
      <SectionHeader title="MARKET PERFORMANCE" />
      <MarketPerformance stats={performanceStats} />

      {/* ── Section 4: Sector Breakdown ── */}
      <SectionHeader title="SECTOR BREAKDOWN" />
      <SectorBreakdown items={sectorItems} />

      {/* ── Section 5: Pipeline (S-1 Filers) ── */}
      <SectionHeader title="PIPELINE — S-1 FILERS" />
      <Pipeline items={pipelineItems} />
    </div>
  );
}
