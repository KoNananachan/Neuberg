import { useEarningsCalendar } from '../../api/hooks/use-earnings-calendar';
import { useT } from '../../i18n';

// ── Formatting helpers ──

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtEps(n: number | null): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function fmtRevenue(n: number | null): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}T`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}B`;
  return `${n.toFixed(0)}M`;
}

function fmtDate(d: string | null): string {
  if (!d) return '--';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function surpriseColor(n: number | null): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function moveColor(n: number | null): string {
  if (n == null) return 'text-neutral/40';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function beatRateColor(rate: number | null): string {
  if (rate == null) return 'text-neutral/40';
  if (rate >= 80) return 'text-green-400';
  if (rate >= 60) return 'text-green-400/70';
  if (rate >= 40) return 'text-yellow-400';
  return 'text-red-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-white/[0.02] border-b border-border/20">
      <span className="text-[9px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ── Section 1: Upcoming Earnings ──

function UpcomingEarnings({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No upcoming earnings
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Company</th>
            <th className="text-center px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Time</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Est</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => (
            <tr
              key={`upcoming-${e.symbol}-${e.date}-${i}`}
              className="border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1 text-neutral/60 whitespace-nowrap">{fmtDate(e.date)}</td>
              <td className="px-1.5 py-1 font-bold text-yellow-400">{e.symbol}</td>
              <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[120px]">{e.name ?? e.company ?? '--'}</td>
              <td className="px-1 py-1 text-center">
                {e.time === 'BMO' ? (
                  <span className="text-[8px] px-1 py-0.5 text-blue-400 bg-blue-500/10">BMO</span>
                ) : e.time === 'AMC' ? (
                  <span className="text-[8px] px-1 py-0.5 text-purple-400 bg-purple-500/10">AMC</span>
                ) : (
                  <span className="text-[8px] px-1 py-0.5 text-neutral/40 bg-white/5">{e.time ?? '--'}</span>
                )}
              </td>
              <td className="text-right px-1.5 py-1 text-neutral/60">{fmtEps(e.epsEstimate)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50">{fmtRevenue(e.revenueEstimate ?? null)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 2: Recent Results ──

function RecentResults({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No recent results
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Act</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise %</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Revenue</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Stock Move</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const surprise = e.epsSurprise ?? e.surprise ?? null;
            const stockMove = e.priceReaction ?? e.stockMove ?? e.reaction ?? null;

            return (
              <tr
                key={`result-${e.symbol}-${i}`}
                className="border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-yellow-400">{e.symbol}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(surprise)}`}>
                  {fmtEps(e.epsActual)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {fmtEps(e.epsEstimate)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(surprise)}`}>
                  {fmtPct(surprise)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {fmtRevenue(e.revenue ?? e.revenueActual ?? null)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${moveColor(stockMove)}`}>
                  {fmtPct(stockMove)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 3: Summary Stats ──

function SummaryStats({ summary }: { summary: any }) {
  if (!summary) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No summary data
      </div>
    );
  }

  const beatRate = summary?.beatRate ?? summary?.beatPct ?? null;
  const avgSurprise = summary?.avgSurprise ?? null;
  const sectors: any[] = summary?.sectors ?? summary?.sectorBreakdown ?? [];

  return (
    <div>
      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-px bg-border/10 border-b border-border/20">
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">Beat Rate</div>
          <div className={`text-[11px] font-mono font-bold ${beatRateColor(beatRate)}`}>
            {beatRate != null ? `${beatRate.toFixed(0)}%` : '--'}
          </div>
        </div>
        <div className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider mb-0.5">Avg Surprise</div>
          <div className={`text-[11px] font-mono font-bold ${surpriseColor(avgSurprise)}`}>
            {fmtPct(avgSurprise)}
          </div>
        </div>
      </div>

      {/* Sector breakdown */}
      {sectors.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] font-mono">
            <thead>
              <tr className="bg-white/[0.03] border-b border-border/20">
                <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
                <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Reported</th>
                <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Beat Rate</th>
                <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Avg Surprise</th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((s: any, i: number) => {
                const sBeatRate = s.beatRate ?? s.beatPct ?? null;
                const sAvgSurprise = s.avgSurprise ?? null;

                return (
                  <tr
                    key={`sector-${s.sector ?? s.name}-${i}`}
                    className="border-b border-border/10 hover:bg-yellow-400/[0.02] transition-colors"
                  >
                    <td className="px-2 py-1 text-neutral/70 uppercase">{s.sector ?? s.name ?? '--'}</td>
                    <td className="text-right px-1.5 py-1 text-neutral/60">{s.reported ?? s.count ?? '--'}</td>
                    <td className={`text-right px-1.5 py-1 font-bold ${beatRateColor(sBeatRate)}`}>
                      {sBeatRate != null ? `${sBeatRate.toFixed(0)}%` : '--'}
                    </td>
                    <td className={`text-right px-1.5 py-1 ${surpriseColor(sAvgSurprise)}`}>
                      {fmtPct(sAvgSurprise)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function EarningsCalendarPanel() {
  const t = useT();
  const { data, isLoading } = useEarningsCalendar();
  const d = data as any;

  if (isLoading) {
    return (
      <div className="h-full bg-black flex items-center justify-center">
        <span className="text-[9px] font-mono text-neutral/40 uppercase tracking-wider">
          Loading...
        </span>
      </div>
    );
  }

  const upcomingItems: any[] = d?.upcoming ?? d?.thisWeek?.filter((e: any) => !e.reported) ?? d?.events?.filter((e: any) => !e.reported) ?? [];
  const recentItems: any[] = d?.recentResults ?? d?.results ?? d?.recentSurprises ?? d?.thisWeek?.filter((e: any) => e.reported) ?? [];
  const summaryData = d?.summary ?? d?.stats ?? (d?.sectorSummary ? { sectors: d.sectorSummary, beatRate: d.beatRate, avgSurprise: d.avgSurprise } : null);

  return (
    <div className="h-full bg-black text-[9px] font-mono overflow-y-auto">
      {/* ── Header with accent bar ── */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-black sticky top-0 z-10 flex items-center gap-2">
        <div className="w-0.5 h-3 bg-yellow-400" />
        <span className="text-[10px] font-mono font-bold text-yellow-400 uppercase tracking-wider">
          Earnings Calendar
        </span>
      </div>

      {/* ── Section 1: Upcoming Earnings ── */}
      <SectionHeader title="UPCOMING EARNINGS" />
      <UpcomingEarnings items={upcomingItems} />

      {/* ── Section 2: Recent Results ── */}
      <SectionHeader title="RECENT RESULTS" />
      <RecentResults items={recentItems} />

      {/* ── Section 3: Summary Stats ── */}
      <SectionHeader title="SUMMARY STATS" />
      <SummaryStats summary={summaryData} />
    </div>
  );
}
