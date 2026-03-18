import { useMergerArbitrage } from '../../api/hooks/use-merger-arbitrage';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// ── Color helpers ──

function spreadColor(n: number): string {
  if (n > 5) return 'text-green-400';
  if (n > 2) return 'text-green-400/70';
  if (n > 0) return 'text-yellow-400';
  return 'text-red-400';
}

function statusStyle(status: string): { text: string; bg: string } {
  const s = status?.toLowerCase() ?? '';
  if (s === 'completed' || s === 'closed') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'pending' || s === 'active') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (s === 'at risk' || s === 'challenged') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s === 'regulatory review') return { text: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function dealTypeBadge(type: string): { text: string; bg: string } {
  const t = type?.toUpperCase() ?? '';
  if (t === 'CASH') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (t === 'STOCK') return { text: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' };
  if (t === 'MIXED') return { text: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function riskLevelStyle(level: string): { text: string; bg: string } {
  const l = level?.toLowerCase() ?? '';
  if (l === 'low') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (l === 'medium') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (l === 'high') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border-neutral-500/30' };
}

function impactColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function MergerArbitragePanel() {
  const t = useT();
  const { data, isLoading, error } = useMergerArbitrage();
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-green-400">
            {tr(t, 'maTitle', 'Merger Arbitrage Monitor')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-green-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading' as any)}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {d && (
          <>
            <ActiveDealsSection deals={d.activeDeals} t={t} />
            <SpreadAnalysisSection analysis={d.spreadAnalysis} t={t} />
            <RiskMonitorsSection risks={d.riskMonitors} t={t} />
            <RecentEventsSection events={d.recentEvents} t={t} />
            <SectorBreakdownSection sectors={d.sectorBreakdown} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Section 1: Active Deals ──

function ActiveDealsSection({
  deals,
  t,
}: {
  deals: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!deals?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'maActiveDeals', 'Active Deals')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">{deals.length}</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_50px_52px_52px_48px_48px_56px_48px_52px_60px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Target / Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Offer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Current</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Ann.</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Prob</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Status</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Close</span>
      </div>

      {/* Rows */}
      {deals.map((deal: any, i: number) => {
        const status = statusStyle(deal.status);
        const dtype = dealTypeBadge(deal.dealType);

        return (
          <div
            key={deal.id ?? i}
            className="grid grid-cols-[1fr_50px_52px_52px_48px_48px_56px_48px_52px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
          >
            {/* Target / Acquirer */}
            <div className="truncate pr-1">
              <span className="text-[8px] font-mono font-bold text-white">{deal.target}</span>
              {deal.acquirer && (
                <span className="text-[7px] font-mono text-neutral-600"> / {deal.acquirer}</span>
              )}
            </div>

            {/* Deal type badge */}
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${dtype.text} ${dtype.bg}`}>
                {deal.dealType}
              </span>
            </div>

            {/* Offer price */}
            <span className="text-[8px] font-mono text-white text-right">{fmtPrice(deal.offerPrice)}</span>

            {/* Current price */}
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPrice(deal.currentPrice)}</span>

            {/* Spread % (accented) */}
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(deal.spreadPct)}`}>
              {fmtPct(deal.spreadPct)}
            </span>

            {/* Annualized return */}
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(deal.annualizedReturn)}`}>
              {fmtPct(deal.annualizedReturn)}
            </span>

            {/* Deal value */}
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(deal.dealValue)}</span>

            {/* Probability */}
            <span className="text-[8px] font-mono text-white text-right">
              {deal.probability != null ? `${deal.probability}%` : '--'}
            </span>

            {/* Status badge */}
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${status.text} ${status.bg}`}>
                {deal.status}
              </span>
            </div>

            {/* Expected close */}
            <span className="text-[7px] font-mono text-neutral-500 text-right">{fmtDate(deal.expectedClose)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section 2: Spread Analysis ──

function SpreadAnalysisSection({
  analysis,
  t,
}: {
  analysis: any;
  t: ReturnType<typeof useT>;
}) {
  if (!analysis) return null;

  const metrics = [
    { label: tr(t, 'maAvgSpread', 'Avg Spread'), value: fmtPct(analysis.avgSpread), color: spreadColor(analysis.avgSpread ?? 0) },
    { label: tr(t, 'maMedianSpread', 'Median Spread'), value: fmtPct(analysis.medianSpread), color: spreadColor(analysis.medianSpread ?? 0) },
    { label: tr(t, 'maTightest', 'Tightest'), value: fmtPct(analysis.tightestSpread), color: 'text-yellow-400' },
    { label: tr(t, 'maWidest', 'Widest'), value: fmtPct(analysis.widestSpread), color: 'text-green-400' },
    { label: tr(t, 'maVsHistorical', 'vs Historical'), value: fmtPct(analysis.vsHistorical), color: impactColor(analysis.vsHistorical ?? 0) },
    { label: tr(t, 'maIndexYTD', 'Index YTD'), value: fmtPct(analysis.indexYTD), color: impactColor(analysis.indexYTD ?? 0) },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'maSpreadAnalysis', 'Spread Analysis')}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-px bg-border/10">
        {metrics.map((m) => (
          <div key={m.label} className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {m.label}
            </div>
            <div className={`text-[9px] font-mono font-bold ${m.color}`}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Section 3: Risk Monitors ──

function RiskMonitorsSection({
  risks,
  t,
}: {
  risks: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!risks?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'maRiskMonitors', 'Risk Monitors')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_72px_72px_72px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Deal</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Regulatory</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Antitrust</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Financing</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">Litigation</span>
      </div>

      {risks.map((risk: any, i: number) => (
        <div
          key={risk.deal ?? i}
          className="grid grid-cols-[1fr_72px_72px_72px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{risk.deal}</span>
          <RiskBadge level={risk.regulatory} />
          <RiskBadge level={risk.antitrust} />
          <RiskBadge level={risk.financing} />
          <RiskBadge level={risk.litigation} />
        </div>
      ))}
    </div>
  );
}

function RiskBadge({ level }: { level: string | null | undefined }) {
  if (!level) return <span className="text-[7px] font-mono text-neutral-600 text-center">--</span>;
  const style = riskLevelStyle(level);
  return (
    <div className="flex justify-center">
      <span className={`px-1.5 py-px text-[6px] font-mono font-black uppercase border ${style.text} ${style.bg}`}>
        {level}
      </span>
    </div>
  );
}

// ── Section 4: Recent Events ──

function RecentEventsSection({
  events,
  t,
}: {
  events: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!events?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'maRecentEvents', 'Recent Events')}
        </span>
      </div>

      {events.map((event: any, i: number) => (
        <div
          key={event.id ?? i}
          className="flex items-center gap-2 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors"
        >
          {/* Timeline dot */}
          <div className="w-1 h-1 bg-neutral-600 shrink-0" />

          {/* Deal name */}
          <span className="text-[8px] font-mono font-bold text-white w-28 truncate shrink-0">
            {event.deal}
          </span>

          {/* Event type */}
          <span className="text-[7px] font-mono text-neutral-400 w-24 truncate shrink-0">
            {event.eventType}
          </span>

          {/* Date */}
          <span className="text-[7px] font-mono text-neutral-600 w-16 shrink-0">
            {fmtDate(event.date)}
          </span>

          {/* Spread impact */}
          <span className={`text-[8px] font-mono font-bold ml-auto ${impactColor(event.spreadImpact ?? 0)}`}>
            {event.spreadImpact != null ? fmtPct(event.spreadImpact) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section 5: Sector Breakdown ──

function SectorBreakdownSection({
  sectors,
  t,
}: {
  sectors: any[];
  t: ReturnType<typeof useT>;
}) {
  if (!sectors?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-purple-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'maSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Sector</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Count</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Avg Sprd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Avg Ann.</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">Tot Value</span>
      </div>

      {sectors.map((sector: any, i: number) => (
        <div
          key={sector.name ?? i}
          className="grid grid-cols-[1fr_48px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-green-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{sector.name}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{sector.count ?? '--'}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(sector.avgSpread ?? 0)}`}>
            {fmtPct(sector.avgSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(sector.avgAnnualizedReturn ?? 0)}`}>
            {fmtPct(sector.avgAnnualizedReturn)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(sector.totalValue)}</span>
        </div>
      ))}
    </div>
  );
}
