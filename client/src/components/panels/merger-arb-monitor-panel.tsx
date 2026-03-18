import { useMergerArbMonitor } from '../../api/hooks/use-merger-arb-monitor';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtPrice(n: number): string {
  return n.toFixed(2);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtDays(n: number): string {
  return n.toFixed(0);
}

function fmtCount(n: number): string {
  return n.toLocaleString();
}

function fmtVol(n: number): string {
  return n.toFixed(1);
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(n: number): string {
  if (n > 10) return 'text-green-400';
  if (n > 5) return 'text-fuchsia-400';
  if (n > 0) return 'text-neutral-400';
  return 'text-red-400';
}

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'PENDING' || s === 'ACTIVE') return 'bg-fuchsia-400/20 text-fuchsia-400 border-fuchsia-400/30';
  if (s === 'APPROVED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'AT RISK' || s === 'CHALLENGED') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'BROKEN' || s === 'TERMINATED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'COMPLETED' || s === 'CLOSED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function riskColor(level: string): string {
  const l = level.toUpperCase();
  if (l === 'LOW') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (l === 'MODERATE' || l === 'MEDIUM') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (l === 'HIGH') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (l === 'CRITICAL') return 'bg-red-400/30 text-red-400 border-red-400/50';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function trendArrow(n: number): string {
  if (n > 0) return '\u25B2';
  if (n < 0) return '\u25BC';
  return '\u25C6';
}

// -- Interfaces --

interface ArbSummary {
  activeDeals: number;
  avgSpread: number;
  avgAnnualized: number;
  totalDealValue: number;
  completionRate: number;
}

interface ActiveDeal {
  target: string;
  acquirer: string;
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedReturn: number;
  daysToClose: number;
  status: string;
  dealValue: number;
}

interface DealRisk {
  target: string;
  riskLevel: string;
  regulatoryRisk: number;
  financingRisk: number;
  shareholderRisk: number;
  overallScore: number;
  keyRisk: string;
}

interface RegulatoryEvent {
  target: string;
  agency: string;
  event: string;
  date: string;
  status: string;
}

interface CompletedDeal {
  target: string;
  acquirer: string;
  finalSpread: number;
  daysOpen: number;
  annualizedReturn: number;
  completionDate: string;
}

interface BrokenDeal {
  target: string;
  acquirer: string;
  breakDate: string;
  preDealPrice: number;
  postBreakPrice: number;
  lossPct: number;
  reason: string;
}

interface SectorActivity {
  sector: string;
  activeDeals: number;
  avgSpread: number;
  totalValue: number;
  change1w: number;
}

interface SpreadHistoryEntry {
  period: string;
  avgSpread: number;
  medianSpread: number;
  narrowest: number;
  widest: number;
  change: number;
}

// -- Main Panel --

export function MergerArbMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMergerArbMonitor();

  const summary = data?.summary as ArbSummary | undefined;
  const activeDeals = data?.activeDeals as ActiveDeal[] | undefined;
  const dealRisks = data?.dealRisks as DealRisk[] | undefined;
  const regulatoryTimeline = data?.regulatoryTimeline as RegulatoryEvent[] | undefined;
  const recentCompletions = data?.recentCompletions as CompletedDeal[] | undefined;
  const brokenDeals = data?.brokenDeals as BrokenDeal[] | undefined;
  const sectorActivity = data?.sectorActivity as SectorActivity[] | undefined;
  const spreadHistory = data?.spreadHistory as SpreadHistoryEntry[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-fuchsia-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-fuchsia-400">
            {tr(t, 'panelMergerArbMonitor', 'Merger Arb Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelMergerArbMonitorNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <ArbStatsBar summary={summary} t={t} />}
            {activeDeals && activeDeals.length > 0 && (
              <ActiveDealsSection deals={activeDeals} t={t} />
            )}
            {dealRisks && dealRisks.length > 0 && (
              <DealRiskSection risks={dealRisks} t={t} />
            )}
            {regulatoryTimeline && regulatoryTimeline.length > 0 && (
              <RegulatoryTimelineSection events={regulatoryTimeline} t={t} />
            )}
            {recentCompletions && recentCompletions.length > 0 && (
              <RecentCompletionsSection completions={recentCompletions} t={t} />
            )}
            {brokenDeals && brokenDeals.length > 0 && (
              <BrokenDealsSection deals={brokenDeals} t={t} />
            )}
            {sectorActivity && sectorActivity.length > 0 && (
              <SectorActivitySection sectors={sectorActivity} t={t} />
            )}
            {spreadHistory && spreadHistory.length > 0 && (
              <SpreadHistorySection history={spreadHistory} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Arb Stats Summary Bar --

function ArbStatsBar({
  summary,
  t,
}: {
  summary: ArbSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-fuchsia-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMergerArbMonitorActiveDeals', 'Active Deals')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.activeDeals}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMergerArbMonitorAvgSpread', 'Avg Spread')}
          </div>
          <div className="text-[10px] font-mono font-bold text-fuchsia-400">
            {fmtPct(summary.avgSpread)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMergerArbMonitorAvgAnnualized', 'Avg Ann. Return')}
          </div>
          <div className="text-[10px] font-mono font-bold text-fuchsia-400">
            {fmtPct(summary.avgAnnualized)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMergerArbMonitorDealValue', 'Total Value ($B)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtVol(summary.totalDealValue)}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelMergerArbMonitorCompletionRate', 'Completion Rate')}
          </div>
          <div className="text-[10px] font-mono font-bold text-fuchsia-400">
            {fmtPct(summary.completionRate)}%
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Active Deals Section --

function ActiveDealsSection({
  deals,
  t,
}: {
  deals: ActiveDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorActiveDealsTable', 'Active Deals')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_48px_56px_40px_64px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorOffer', 'Offer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorCurrent', 'Current')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorSpread', 'Sprd %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorAnnualized', 'Ann %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorDays', 'Days')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorStatus', 'Status')}
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => (
        <div
          key={`${deal.target}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_48px_56px_40px_64px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <div className="truncate">
            <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
              {deal.target}
            </span>
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(deal.offerPrice)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(deal.currentPrice)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(deal.spreadPct)}`}>
            {fmtPct(deal.spreadPct)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(deal.annualizedReturn)}`}>
            {fmtPct(deal.annualizedReturn)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDays(deal.daysToClose)}
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${statusColor(deal.status)}`}
            >
              {deal.status}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Deal Risk Assessment Section --

function DealRiskSection({
  risks,
  t,
}: {
  risks: DealRisk[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorDealRisk', 'Deal Risk Assessment')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px_48px_48px_80px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorRiskLevel', 'Risk')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorRegRisk', 'Reg')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorFinRisk', 'Fin')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorShrRisk', 'Shr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorScore', 'Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorKeyRisk', 'Key Risk')}
        </span>
      </div>

      {/* Rows */}
      {risks.map((risk, i) => (
        <div
          key={`${risk.target}-${i}`}
          className="grid grid-cols-[1fr_56px_48px_48px_48px_48px_80px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {risk.target}
          </span>
          <span className="text-right">
            <span
              className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${riskColor(risk.riskLevel)}`}
            >
              {risk.riskLevel}
            </span>
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(risk.regulatoryRisk)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(risk.financingRisk)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(risk.shareholderRisk)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {risk.overallScore.toFixed(1)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {risk.keyRisk}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Regulatory Timeline Section --

function RegulatoryTimelineSection({
  events,
  t,
}: {
  events: RegulatoryEvent[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorRegTimeline', 'Regulatory Timeline')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_1fr_64px_64px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorAgency', 'Agency')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorEvent', 'Event')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorStatus', 'Status')}
        </span>
      </div>

      {/* Rows */}
      {events.map((evt, i) => (
        <div
          key={`${evt.target}-${evt.agency}-${i}`}
          className="grid grid-cols-[1fr_72px_1fr_64px_64px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {evt.target}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {evt.agency}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {evt.event}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {evt.date}
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${statusColor(evt.status)}`}
            >
              {evt.status}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent Completions Section --

function RecentCompletionsSection({
  completions,
  t,
}: {
  completions: CompletedDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorRecentCompletions', 'Recent Completions')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_56px_48px_56px_64px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorAcquirer', 'Acquirer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorFinalSprd', 'Final %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorDaysOpen', 'Days')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorAnnReturn', 'Ann %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorComplDate', 'Closed')}
        </span>
      </div>

      {/* Rows */}
      {completions.map((deal, i) => (
        <div
          key={`${deal.target}-${i}`}
          className="grid grid-cols-[1fr_1fr_56px_48px_56px_64px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {deal.target}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {deal.acquirer}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(deal.finalSpread)}`}>
            {fmtPct(deal.finalSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtDays(deal.daysOpen)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(deal.annualizedReturn)}`}>
            {fmtPct(deal.annualizedReturn)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {deal.completionDate}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Broken Deals Section --

function BrokenDealsSection({
  deals,
  t,
}: {
  deals: BrokenDeal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorBrokenDeals', 'Broken Deals')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_56px_56px_48px_80px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorAcquirer', 'Acquirer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorPreDeal', 'Pre $')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorPostBreak', 'Post $')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorLoss', 'Loss %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorReason', 'Reason')}
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal, i) => (
        <div
          key={`${deal.target}-${i}`}
          className="grid grid-cols-[1fr_1fr_56px_56px_48px_80px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-red-400 truncate">
            {deal.target}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {deal.acquirer}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPrice(deal.preDealPrice)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPrice(deal.postBreakPrice)}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {fmtChg(-Math.abs(deal.lossPct))}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2 truncate">
            {deal.reason}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Activity Section --

function SectorActivitySection({
  sectors,
  t,
}: {
  sectors: SectorActivity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-fuchsia-400/30">
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorSectorActivity', 'Sector Activity')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_56px_64px_48px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorDeals', 'Deals')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorAvgSprd', 'Avg Sprd')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorTotalVal', 'Value $B')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitor1wChg', '1W Chg')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((sector) => (
        <div
          key={sector.sector}
          className="grid grid-cols-[1fr_48px_56px_64px_48px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 truncate">
            {sector.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtCount(sector.activeDeals)}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(sector.avgSpread)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtVol(sector.totalValue)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(sector.change1w)}`}>
            {fmtChg(sector.change1w)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Spread History Section --

function SpreadHistorySection({
  history,
  t,
}: {
  history: SpreadHistoryEntry[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-fuchsia-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelMergerArbMonitorSpreadHistory', 'Spread History')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-fuchsia-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelMergerArbMonitorPeriod', 'Period')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorAvg', 'Avg %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorMedian', 'Med %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorNarrowest', 'Narrow')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelMergerArbMonitorWidest', 'Wide')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelMergerArbMonitorChg', 'Chg')}
        </span>
      </div>

      {/* Rows */}
      {history.map((entry, i) => (
        <div
          key={`${entry.period}-${i}`}
          className="grid grid-cols-[1fr_56px_56px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-fuchsia-400/5 hover:bg-fuchsia-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {entry.period}
          </span>
          <span className="text-[8px] font-mono font-bold text-fuchsia-400 text-right">
            {fmtPct(entry.avgSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtPct(entry.medianSpread)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(entry.narrowest)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(entry.widest)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(entry.change)}`}>
            {trendArrow(entry.change)} {fmtChg(entry.change)}
          </span>
        </div>
      ))}
    </div>
  );
}
