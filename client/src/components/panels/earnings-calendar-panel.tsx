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

function beatRateColor(rate: number | null): string {
  if (rate == null) return 'text-neutral/40';
  if (rate >= 80) return 'text-green-400';
  if (rate >= 60) return 'text-green-400/70';
  if (rate >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function consensusBadge(consensus: string | null): { label: string; cls: string } {
  switch (consensus?.toUpperCase()) {
    case 'BUY':
    case 'STRONG BUY':
      return { label: consensus.toUpperCase(), cls: 'text-green-400 bg-green-500/10' };
    case 'HOLD':
      return { label: 'HOLD', cls: 'text-yellow-400 bg-yellow-500/10' };
    case 'SELL':
    case 'STRONG SELL':
      return { label: consensus.toUpperCase(), cls: 'text-red-400 bg-red-500/10' };
    default:
      return { label: consensus ?? '--', cls: 'text-neutral/40 bg-white/5' };
  }
}

function directionArrow(n: number | null): string {
  if (n == null) return '';
  return n >= 0 ? '\u2191' : '\u2193';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 bg-white/[0.02] border-b border-border/20">
      <span className="text-[9px] font-mono font-bold text-orange-400 uppercase tracking-wider">
        {title}
      </span>
    </div>
  );
}

// ── Section 1: This Week's Earnings ──

function ThisWeekEarnings({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No earnings this week
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Company</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-center px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Time</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Act</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const reported = e.reported === true;
            const surprise = e.epsSurprise ?? null;

            return (
              <tr
                key={`${e.symbol}-${e.date}-${i}`}
                className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-orange-400">{e.symbol}</td>
                <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[100px]">{e.name}</td>
                <td className="px-1.5 py-1 text-neutral/60 whitespace-nowrap">{fmtDate(e.date)}</td>
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
                <td className={`text-right px-1.5 py-1 font-bold ${reported ? surpriseColor(surprise) : 'text-neutral/30'}`}>
                  {reported ? fmtEps(e.epsActual) : '--'}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(surprise)}`}>
                  {surprise != null ? fmtPct(surprise) : '--'}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {fmtRevenue(e.revenueEstimate ?? e.revenue ?? null)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 2: Recent Surprises ──

function RecentSurprises({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No recent surprises
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surprise%</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Reaction</th>
          </tr>
        </thead>
        <tbody>
          {items.slice(0, 10).map((e: any, i: number) => {
            const surprise = e.epsSurprise ?? e.surprise ?? null;
            const reaction = e.priceReaction ?? e.reaction ?? null;

            return (
              <tr
                key={`surprise-${e.symbol}-${i}`}
                className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-orange-400">{e.symbol}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(surprise)}`}>
                  {fmtPct(surprise)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(reaction)}`}>
                  <span>{directionArrow(reaction)} {fmtPct(reaction)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 3: Revision Trends ──

function RevisionTrends({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No revision data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Current</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">30D Ago</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev%</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Up</th>
            <th className="text-right px-1 py-1 text-neutral/40 uppercase tracking-wider font-medium">Down</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Consensus</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const revPct = e.revisionPct ?? e.revision ?? null;
            const badge = consensusBadge(e.consensus);

            return (
              <tr
                key={`revision-${e.symbol}-${i}`}
                className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-orange-400">{e.symbol}</td>
                <td className="text-right px-1.5 py-1 text-neutral/70">{fmtEps(e.current ?? e.currentEstimate ?? null)}</td>
                <td className="text-right px-1.5 py-1 text-neutral/50">{fmtEps(e.thirtyDaysAgo ?? e.previous ?? null)}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${surpriseColor(revPct)}`}>
                  {fmtPct(revPct)}
                </td>
                <td className="text-right px-1 py-1 text-green-400">{e.up ?? e.upRevisions ?? '--'}</td>
                <td className="text-right px-1 py-1 text-red-400">{e.down ?? e.downRevisions ?? '--'}</td>
                <td className="text-center px-1.5 py-1">
                  <span className={`text-[8px] px-1.5 py-0.5 ${badge.cls}`}>
                    {badge.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 4: Sector Summary ──

function SectorSummary({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No sector data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Reported</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Beat Rate</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Avg Surprise</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Avg Reaction</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s: any, i: number) => {
            const beatRate = s.beatRate ?? s.beatPct ?? null;
            const avgSurprise = s.avgSurprise ?? null;
            const avgReaction = s.avgReaction ?? null;

            return (
              <tr
                key={`sector-${s.sector ?? s.name}-${i}`}
                className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-neutral/70 uppercase">{s.sector ?? s.name ?? '--'}</td>
                <td className="text-right px-1.5 py-1 text-neutral/60">{s.reported ?? s.count ?? '--'}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${beatRateColor(beatRate)}`}>
                  {beatRate != null ? `${beatRate.toFixed(0)}%` : '--'}
                </td>
                <td className={`text-right px-1.5 py-1 ${surpriseColor(avgSurprise)}`}>
                  {fmtPct(avgSurprise)}
                </td>
                <td className={`text-right px-1.5 py-1 ${surpriseColor(avgReaction)}`}>
                  {fmtPct(avgReaction)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Section 5: Upcoming Highlights ──

function UpcomingHighlights({ items }: { items: any[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="px-2 py-3 text-[9px] font-mono text-neutral/30 uppercase tracking-wider text-center">
        No upcoming highlights
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-2 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Company</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Impl Move</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Analysts</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e: any, i: number) => {
            const impliedMove = e.impliedMove ?? e.expectedMove ?? null;
            const analysts = e.analystCount ?? e.analysts ?? null;

            return (
              <tr
                key={`upcoming-${e.symbol}-${i}`}
                className="border-b border-border/10 hover:bg-orange-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 font-bold text-orange-400">{e.symbol}</td>
                <td className="px-1.5 py-1 text-neutral/50 truncate max-w-[100px]">{e.name ?? e.company ?? '--'}</td>
                <td className="px-1.5 py-1 text-neutral/60 whitespace-nowrap">{fmtDate(e.date)}</td>
                <td className="text-right px-1.5 py-1 text-orange-400/80">
                  {impliedMove != null ? `${impliedMove.toFixed(1)}%` : '--'}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {analysts ?? '--'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function EarningsCalendarPanel() {
  const t = useT();
  const { data, isLoading, error } = useEarningsCalendar();
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

  // Extract sections from the data, with flexible key access
  const thisWeekItems: any[] = d?.thisWeek ?? d?.events ?? [];
  const recentSurprises: any[] = d?.recentSurprises ?? d?.surprises ?? thisWeekItems.filter((e: any) => e.reported);
  const revisionTrends: any[] = d?.revisionTrends ?? d?.revisions ?? [];
  const sectorSummary: any[] = d?.sectorSummary ?? d?.sectors ?? [];
  const upcomingHighlights: any[] = d?.upcomingHighlights ?? d?.upcoming ?? thisWeekItems.filter((e: any) => !e.reported);

  return (
    <div className="h-full bg-black text-[9px] font-mono overflow-y-auto">
      {/* ── Header ── */}
      <div className="px-2 py-1.5 border-b border-border/20 bg-black sticky top-0 z-10">
        <span className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-wider">
          {t('panelEarningsCalendar' as any) || 'EARNINGS CALENDAR & ESTIMATES'}
        </span>
      </div>

      {/* ── Section 1: This Week's Earnings ── */}
      <SectionHeader title="THIS WEEK'S EARNINGS" />
      <ThisWeekEarnings items={thisWeekItems} />

      {/* ── Section 2: Recent Surprises ── */}
      <SectionHeader title="RECENT SURPRISES" />
      <RecentSurprises items={recentSurprises} />

      {/* ── Section 3: Revision Trends ── */}
      <SectionHeader title="REVISION TRENDS" />
      <RevisionTrends items={revisionTrends} />

      {/* ── Section 4: Sector Summary ── */}
      <SectionHeader title="SECTOR SUMMARY" />
      <SectorSummary items={sectorSummary} />

      {/* ── Section 5: Upcoming Highlights ── */}
      <SectionHeader title="UPCOMING HIGHLIGHTS" />
      <UpcomingHighlights items={upcomingHighlights} />
    </div>
  );
}
