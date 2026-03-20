import { useMergerArb } from '../../api/hooks/use-merger-arb';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(2);
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(0);
}

function fmtDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// -- Color helpers --

function spreadColor(n: number): string {
  if (n > 8) return 'text-red-400';
  if (n > 5) return 'text-amber-400';
  if (n > 2) return 'text-yellow-400';
  if (n > 0) return 'text-green-400';
  return 'text-neutral-500';
}

function probColor(n: number): string {
  if (n >= 90) return 'text-green-400';
  if (n >= 75) return 'text-green-400/70';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 25) return 'text-amber-400';
  return 'text-red-400';
}

function spreadDirectionColor(n: number): string {
  if (n < 0) return 'text-green-400';
  if (n > 0) return 'text-amber-400';
  return 'text-neutral-500';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function dealTypeBadge(type: string): string {
  const t = type?.toUpperCase() ?? '';
  if (t === 'CASH') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (t === 'STOCK') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  if (t === 'MIXED') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function statusBadge(status: string): string {
  const s = status?.toLowerCase() ?? '';
  if (s === 'completed' || s === 'closed') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (s === 'pending' || s === 'active') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (s === 'regulatory review') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (s === 'at risk' || s === 'challenged') return 'bg-red-500/10 text-red-400 border-red-500/30';
  if (s === 'approved') return 'bg-green-500/10 text-green-400 border-green-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function riskLevelBadge(level: string): string {
  const l = level?.toLowerCase() ?? '';
  if (l === 'low') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (l === 'medium') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
  if (l === 'high') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

function outcomeBadge(outcome: string): string {
  const o = outcome?.toLowerCase() ?? '';
  if (o === 'completed' || o === 'success') return 'bg-green-500/10 text-green-400 border-green-500/30';
  if (o === 'terminated' || o === 'broken') return 'bg-red-500/10 text-red-400 border-red-500/30';
  if (o === 'amended') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/30';
}

// -- Interfaces --

interface Summary {
  totalActiveDeals: number;
  totalValue: number;
  avgSpreadPct: number;
  avgAnnualizedPct: number;
  highestSpread: number;
  lowestSpread: number;
  breakCount12M: number;
}

interface RiskArbMetrics {
  universeCount: number;
  totalDealValue: number;
  avgGrossSpread: number;
  annualizedReturn: number;
  dealBreakRate: number;
  avgDaysToClose: number;
}

interface ActiveMerger {
  target: string;
  acquirer: string;
  dealValue: number;
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedPct: number;
  dealType: string;
  premiumPct: number;
  status: string;
  probabilityPct: number;
}

interface RegulatoryWatch {
  target: string;
  acquirer: string;
  regulator: string;
  concern: string;
  deadline: string;
  riskLevel: string;
}

interface TopSpread {
  target: string;
  acquirer: string;
  spreadPct: number;
  annualizedPct: number;
  probabilityPct: number;
}

interface SectorDeal {
  sector: string;
  activeDeals: number;
  totalValue: number;
  avgSpread: number;
  avgProbability: number;
  avgTimeToClose: number;
}

interface RecentCompletion {
  target: string;
  acquirer: string;
  value: number;
  completionDate: string;
  finalSpread: number;
  daysToClose: number;
  outcome: string;
}

// -- Main Panel --

export function MergerArbPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMergerArb();
  const d = data as any;

  const summary = d?.summary as Summary | undefined;
  const riskArbMetrics = d?.riskArbMetrics as RiskArbMetrics | undefined;
  const activeMergers = (d?.activeMergers ?? d?.activeDeals) as ActiveMerger[] | undefined;
  const regulatoryWatch = (d?.regulatoryWatch ?? d?.regulatory) as RegulatoryWatch[] | undefined;
  const topSpreads = d?.topSpreads as TopSpread[] | undefined;
  const sectorDeals = (d?.sectorDeals ?? d?.sectors) as SectorDeal[] | undefined;
  const recentCompletions = d?.recentCompletions as RecentCompletion[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'marbTitle', 'Merger Arbitrage Tracker')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD DATA
          </div>
        )}

        {d && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {riskArbMetrics && <RiskArbMetricsBar metrics={riskArbMetrics} t={t} />}
            {activeMergers && activeMergers.length > 0 && (
              <ActiveMergersSection mergers={activeMergers.slice(0, 20)} t={t} />
            )}
            {regulatoryWatch && regulatoryWatch.length > 0 && (
              <RegulatoryWatchSection items={regulatoryWatch.slice(0, 5)} t={t} />
            )}
            {topSpreads && topSpreads.length > 0 && (
              <TopSpreadsSection spreads={topSpreads.slice(0, 5)} t={t} />
            )}
            {sectorDeals && sectorDeals.length > 0 && (
              <SectorDealsSection sectors={sectorDeals.slice(0, 8)} t={t} />
            )}
            {recentCompletions && recentCompletions.length > 0 && (
              <RecentCompletionsSection completions={recentCompletions.slice(0, 8)} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Summary Bar --

function SummaryBar({
  summary,
  t,
}: {
  summary: Summary;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { label: tr(t, 'marbActiveDeals', 'Active Deals'), value: String(summary.totalActiveDeals), color: 'text-white' },
    { label: tr(t, 'marbTotalValue', 'Total Value'), value: fmtCompact(summary.totalValue), color: 'text-white' },
    { label: tr(t, 'marbAvgSpread', 'Avg Spread%'), value: fmtPct(summary.avgSpreadPct) + '%', color: 'text-yellow-400' },
    { label: tr(t, 'marbAvgAnn', 'Avg Ann%'), value: fmtPct(summary.avgAnnualizedPct) + '%', color: 'text-yellow-400' },
    { label: tr(t, 'marbHighSpread', 'Highest Sprd'), value: fmtPct(summary.highestSpread) + '%', color: 'text-amber-400' },
    { label: tr(t, 'marbLowSpread', 'Lowest Sprd'), value: fmtPct(summary.lowestSpread) + '%', color: 'text-green-400' },
    { label: tr(t, 'marbBreaks12M', 'Breaks 12M'), value: String(summary.breakCount12M), color: 'text-red-400' },
  ];

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-border/10">
        {items.map((item) => (
          <div key={item.label} className="flex-1 px-2 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Risk Arb Metrics --

function RiskArbMetricsBar({
  metrics,
  t,
}: {
  metrics: RiskArbMetrics;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { label: tr(t, 'marbUniverse', 'Universe'), value: String(metrics.universeCount), color: 'text-white' },
    { label: tr(t, 'marbDealValue', 'Deal Value'), value: fmtCompact(metrics.totalDealValue), color: 'text-white' },
    { label: tr(t, 'marbGrossSprd', 'Gross Spread'), value: fmtPct(metrics.avgGrossSpread) + '%', color: 'text-yellow-400' },
    { label: tr(t, 'marbAnnReturn', 'Ann Return'), value: fmtPct(metrics.annualizedReturn) + '%', color: 'text-yellow-400' },
    { label: tr(t, 'marbBreakRate', 'Break Rate'), value: fmtPct(metrics.dealBreakRate) + '%', color: 'text-red-400' },
    { label: tr(t, 'marbAvgDays', 'Avg Days'), value: fmtDays(metrics.avgDaysToClose), color: 'text-neutral-300' },
  ];

  return (
    <div className="border-b border-border/20 bg-[#030303]">
      <div className="px-3 py-0.5 border-b border-border/10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'marbRiskArbMetrics', 'Risk Arb Metrics')}
        </span>
      </div>
      <div className="flex items-center gap-0 divide-x divide-border/10">
        {items.map((item) => (
          <div key={item.label} className="flex-1 px-2 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className={`text-[10px] font-mono font-bold ${item.color}`}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- Active Mergers Table (20 rows) --

function ActiveMergersSection({
  mergers,
  t,
}: {
  mergers: ActiveMerger[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-yellow-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'marbActiveMergers', 'Active Mergers')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">{mergers.length}</span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_52px_52px_44px_44px_44px_40px_56px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target / Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Offer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Curr</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ann%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Type</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Prem%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">Status</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Prob%</span>
      </div>

      {/* Rows */}
      {mergers.map((m, i) => (
        <div
          key={`${m.target}-${i}`}
          className="grid grid-cols-[1fr_56px_52px_52px_44px_44px_44px_40px_56px_40px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          {/* Target / Acquirer */}
          <div className="truncate pr-1">
            <span className="text-[8px] font-mono font-bold text-white">{m.target}</span>
            {m.acquirer && (
              <span className="text-[7px] font-mono text-neutral-600"> / {m.acquirer}</span>
            )}
          </div>

          {/* Deal value */}
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(m.dealValue)}</span>

          {/* Offer price */}
          <span className="text-[8px] font-mono text-white text-right">{fmtPrice(m.offerPrice)}</span>

          {/* Current price */}
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPrice(m.currentPrice)}</span>

          {/* Spread% - wider = warmer */}
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(m.spreadPct)}`}>
            {fmtPct(m.spreadPct)}
          </span>

          {/* Annualized% */}
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(m.annualizedPct)}`}>
            {fmtPct(m.annualizedPct)}
          </span>

          {/* Deal type badge */}
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${dealTypeBadge(m.dealType)}`}>
              {m.dealType}
            </span>
          </div>

          {/* Premium% */}
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(m.premiumPct)}`}>
            {fmtPct(m.premiumPct)}
          </span>

          {/* Status badge */}
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${statusBadge(m.status)}`}>
              {m.status}
            </span>
          </div>

          {/* Probability% */}
          <span className={`text-[8px] font-mono font-bold text-right pr-1 ${probColor(m.probabilityPct)}`}>
            {m.probabilityPct != null ? fmtPct(m.probabilityPct) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory Watch (5 rows) --

function RegulatoryWatchSection({
  items,
  t,
}: {
  items: RegulatoryWatch[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-red-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'marbRegulatoryWatch', 'Regulatory Watch')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_1fr_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target / Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Regulator</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Concern</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Deadline</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">Risk</span>
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={`${item.target}-${i}`}
          className="grid grid-cols-[1fr_72px_1fr_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <div className="truncate pr-1">
            <span className="text-[8px] font-mono font-bold text-white">{item.target}</span>
            {item.acquirer && (
              <span className="text-[7px] font-mono text-neutral-600"> / {item.acquirer}</span>
            )}
          </div>
          <span className="text-[8px] font-mono text-neutral-400 truncate">{item.regulator}</span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">{item.concern}</span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{fmtDate(item.deadline)}</span>
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${riskLevelBadge(item.riskLevel)}`}>
              {item.riskLevel}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Top Spreads (5 rows) --

function TopSpreadsSection({
  spreads,
  t,
}: {
  spreads: TopSpread[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-amber-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'marbTopSpreads', 'Top Spreads')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Ann%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Prob%</span>
      </div>

      {/* Rows */}
      {spreads.map((s, i) => (
        <div
          key={`${s.target}-${i}`}
          className="grid grid-cols-[1fr_1fr_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-yellow-400 truncate pr-1">{s.target}</span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">{s.acquirer}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s.spreadPct)}`}>
            {fmtPct(s.spreadPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s.annualizedPct)}`}>
            {fmtPct(s.annualizedPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-1 ${probColor(s.probabilityPct)}`}>
            {fmtPct(s.probabilityPct)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Deals (8 rows) --

function SectorDealsSection({
  sectors,
  t,
}: {
  sectors: SectorDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-blue-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'marbSectorDeals', 'Sector Deals')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_64px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Sector</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Deals</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg Sprd</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Avg Prob</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">Avg Days</span>
      </div>

      {/* Rows */}
      {sectors.map((s, i) => (
        <div
          key={`${s.sector}-${i}`}
          className="grid grid-cols-[1fr_48px_64px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{s.sector}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">{s.activeDeals}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(s.totalValue)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s.avgSpread)}`}>
            {fmtPct(s.avgSpread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${probColor(s.avgProbability)}`}>
            {fmtPct(s.avgProbability)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-1">
            {fmtDays(s.avgTimeToClose)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent Completions (8 rows) --

function RecentCompletionsSection({
  completions,
  t,
}: {
  completions: RecentCompletion[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-green-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'marbRecentCompletions', 'Recent Completions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_64px_64px_48px_40px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Acquirer</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Value</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Closed</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Sprd%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Days</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-1">Outcome</span>
      </div>

      {/* Rows */}
      {completions.map((c, i) => (
        <div
          key={`${c.target}-${i}`}
          className="grid grid-cols-[1fr_1fr_64px_64px_48px_40px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate pr-1">{c.target}</span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">{c.acquirer}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtCompact(c.value)}</span>
          <span className="text-[7px] font-mono text-neutral-500 text-right">{fmtDate(c.completionDate)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadDirectionColor(c.finalSpread)}`}>
            {fmtPct(c.finalSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtDays(c.daysToClose)}</span>
          <div className="flex justify-center">
            <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${outcomeBadge(c.outcome)}`}>
              {c.outcome}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
