import { useShareholderActivism } from '../../api/hooks/use-shareholder-activism';
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
  return n.toFixed(1);
}

function fmtAum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}T`;
  return `${n.toFixed(1)}B`;
}

function fmtCount(n: number): string {
  return n.toLocaleString();
}

// -- Color helpers --

function statusColor(status: string): string {
  const s = status.toUpperCase();
  if (s === 'WON' || s === 'SETTLED' || s === 'SUCCESS')
    return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'ACTIVE' || s === 'ONGOING' || s === 'PENDING')
    return 'bg-orange-400/20 text-orange-400 border-orange-400/30';
  if (s === 'LOST' || s === 'WITHDRAWN' || s === 'FAILED')
    return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (s === 'PROXY FIGHT' || s === 'ESCALATED')
    return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function outcomeColor(outcome: string): string {
  const o = outcome.toUpperCase();
  if (o === 'WON' || o === 'SETTLED' || o === 'SUCCESS') return 'text-green-400';
  if (o === 'LOST' || o === 'FAILED') return 'text-red-400';
  if (o === 'PENDING' || o === 'ONGOING') return 'text-orange-400';
  return 'text-neutral-500';
}

function winRateColor(pct: number): string {
  if (pct >= 70) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

// -- Interfaces --

interface ActivismSummary {
  activeCampaigns: number;
  new13dFilings: number;
  avgStake: number;
  topActivist: string;
  avgCampaignLength: number;
}

interface Campaign {
  activist: string;
  target: string;
  stakePct: number;
  demands: string;
  status: string;
  filingDate: string;
}

interface Filing13D {
  activist: string;
  target: string;
  stakePct: number;
  filingDate: string;
  formType: string;
  change: string;
}

interface TopActivist {
  name: string;
  aum: number;
  activeCampaigns: number;
  winRate: number;
  avgReturn: number;
  rank: number;
}

interface CampaignOutcome {
  outcome: string;
  count: number;
  pct: number;
  avgDuration: number;
}

interface SectorTarget {
  sector: string;
  campaigns: number;
  pct: number;
  avgStake: number;
}

interface Tactic {
  tactic: string;
  usage: number;
  successRate: number;
}

interface UpcomingEvent {
  date: string;
  company: string;
  activist: string;
  event: string;
  type: string;
}

// -- Main Panel --

export function ShareholderActivismPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useShareholderActivism();

  const summary = data?.summary as ActivismSummary | undefined;
  const campaigns = data?.campaigns as Campaign[] | undefined;
  const filings = data?.filings as Filing13D[] | undefined;
  const topActivists = data?.topActivists as TopActivist[] | undefined;
  const outcomes = data?.outcomes as CampaignOutcome[] | undefined;
  const sectorTargets = data?.sectorTargets as SectorTarget[] | undefined;
  const tactics = data?.tactics as Tactic[] | undefined;
  const upcomingEvents = data?.upcomingEvents as UpcomingEvent[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-orange-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-orange-400">
            {tr(t, 'panelShareholderActivism', 'Shareholder Activism')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'panelShareholderActivismNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {summary && <SummaryBar summary={summary} t={t} />}
            {campaigns && campaigns.length > 0 && (
              <ActiveCampaignsSection campaigns={campaigns} t={t} />
            )}
            {filings && filings.length > 0 && (
              <Recent13DFilingsSection filings={filings} t={t} />
            )}
            {topActivists && topActivists.length > 0 && (
              <TopActivistsSection activists={topActivists} t={t} />
            )}
            {outcomes && outcomes.length > 0 && (
              <CampaignOutcomesSection outcomes={outcomes} t={t} />
            )}
            {sectorTargets && sectorTargets.length > 0 && (
              <SectorTargetsSection sectors={sectorTargets} t={t} />
            )}
            {tactics && tactics.length > 0 && (
              <TacticsUsedSection tactics={tactics} t={t} />
            )}
            {upcomingEvents && upcomingEvents.length > 0 && (
              <UpcomingEventsSection events={upcomingEvents} t={t} />
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
  summary: ActivismSummary;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-orange-400/10">
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelShareholderActivismActiveCampaigns', 'Active Campaigns')}
          </div>
          <div className="text-[10px] font-mono font-bold text-orange-400">
            {summary.activeCampaigns}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelShareholderActivismNew13D', 'New 13D Filings')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.new13dFilings}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelShareholderActivismAvgStake', 'Avg Stake %')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {fmtPct(summary.avgStake)}%
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelShareholderActivismTopActivist', 'Top Activist')}
          </div>
          <div className="text-[10px] font-mono font-bold text-orange-400 truncate">
            {summary.topActivist}
          </div>
        </div>
        <div className="flex-1 px-3 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'panelShareholderActivismAvgLength', 'Avg Length (mo)')}
          </div>
          <div className="text-[10px] font-mono font-bold text-white">
            {summary.avgCampaignLength}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Active Campaigns Section --

function ActiveCampaignsSection({
  campaigns,
  t,
}: {
  campaigns: Campaign[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismCampaigns', 'Active Campaigns')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_72px_40px_1fr_64px_56px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismActivist', 'Activist')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismStake', 'Stake')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pl-2">
          {tr(t, 'panelShareholderActivismDemands', 'Demands')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismStatus', 'Status')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismFiled', 'Filed')}
        </span>
      </div>

      {/* Rows */}
      {campaigns.map((c, i) => (
        <div
          key={`${c.activist}-${c.target}-${i}`}
          className="grid grid-cols-[80px_72px_40px_1fr_64px_56px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {c.activist}
          </span>
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {c.target}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(c.stakePct)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate pl-2">
            {c.demands}
          </span>
          <div className="flex justify-end">
            <span
              className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${statusColor(c.status)}`}
            >
              {c.status}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-500 text-right pr-2">
            {c.filingDate}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Recent 13D Filings Section --

function Recent13DFilingsSection({
  filings,
  t,
}: {
  filings: Filing13D[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivism13D', 'Recent 13D Filings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_72px_40px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismFiler', 'Filer')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismTarget', 'Target')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismStake', 'Stake')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismForm', 'Form')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismChange', 'Change')}
        </span>
      </div>

      {/* Rows */}
      {filings.map((f, i) => (
        <div
          key={`${f.activist}-${f.target}-${i}`}
          className="grid grid-cols-[80px_72px_40px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {f.activist}
          </span>
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {f.target}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(f.stakePct)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {f.filingDate}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {f.formType}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {f.change}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Top Activists Section --

function TopActivistsSection({
  activists,
  t,
}: {
  activists: TopActivist[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismTopActivists', 'Top Activists')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[24px_1fr_56px_48px_56px_56px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismRank', '#')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismName', 'Name')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismAum', 'AUM')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismCamp', 'Camps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismWinRate', 'Win %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismAvgRet', 'Avg Ret')}
        </span>
      </div>

      {/* Rows */}
      {activists.map((a) => (
        <div
          key={`${a.name}-${a.rank}`}
          className="grid grid-cols-[24px_1fr_56px_48px_56px_56px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-500">
            {a.rank}
          </span>
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {a.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtAum(a.aum)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {a.activeCampaigns}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${winRateColor(a.winRate)}`}>
            {fmtPct(a.winRate)}%
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right pr-2">
            {fmtPct(a.avgReturn)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Campaign Outcomes Section --

function CampaignOutcomesSection({
  outcomes,
  t,
}: {
  outcomes: CampaignOutcome[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismOutcomes', 'Campaign Outcomes')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_56px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismOutcome', 'Outcome')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismCount', 'Count')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismPct', '% Total')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismAvgDur', 'Avg Dur')}
        </span>
      </div>

      {/* Rows */}
      {outcomes.map((o) => (
        <div
          key={o.outcome}
          className="grid grid-cols-[1fr_48px_80px_56px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className={`text-[8px] font-mono font-bold ${outcomeColor(o.outcome)}`}>
            {o.outcome}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtCount(o.count)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-orange-400"
                style={{ width: `${Math.min(o.pct, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(o.pct)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {o.avgDuration}mo
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Sector Targets Section --

function SectorTargetsSection({
  sectors,
  t,
}: {
  sectors: SectorTarget[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismSectors', 'Sector Targets')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_80px_48px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismSector', 'Sector')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismCampaignsCount', 'Camps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismShare', 'Share')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismAvgStk', 'Avg %')}
        </span>
      </div>

      {/* Rows */}
      {sectors.map((s) => (
        <div
          key={s.sector}
          className="grid grid-cols-[1fr_48px_80px_48px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {s.sector}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {s.campaigns}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-orange-400"
                style={{ width: `${Math.min(s.pct, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(s.pct)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-300 text-right pr-2">
            {fmtPct(s.avgStake)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Tactics Used Section --

function TacticsUsedSection({
  tactics,
  t,
}: {
  tactics: Tactic[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismTactics', 'Tactics Used')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_80px_80px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismTactic', 'Tactic')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'panelShareholderActivismUsage', 'Usage')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismSuccessRate', 'Success %')}
        </span>
      </div>

      {/* Rows */}
      {tactics.map((tc) => (
        <div
          key={tc.tactic}
          className="grid grid-cols-[1fr_80px_80px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {tc.tactic}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-orange-400"
                style={{ width: `${Math.min(tc.usage, 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono font-bold text-white w-8 text-right">
              {fmtPct(tc.usage)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${winRateColor(tc.successRate)}`}>
            {fmtPct(tc.successRate)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Upcoming Events Section --

function UpcomingEventsSection({
  events,
  t,
}: {
  events: UpcomingEvent[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'panelShareholderActivismEvents', 'Upcoming Events')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_72px_80px_1fr_56px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismActivist', 'Activist')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'panelShareholderActivismEvent', 'Event')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'panelShareholderActivismType', 'Type')}
        </span>
      </div>

      {/* Rows */}
      {events.map((e, i) => (
        <div
          key={`${e.company}-${e.date}-${i}`}
          className="grid grid-cols-[56px_72px_80px_1fr_56px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono text-neutral-400">
            {e.date}
          </span>
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {e.company}
          </span>
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">
            {e.activist}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 truncate">
            {e.event}
          </span>
          <div className="flex justify-end pr-2">
            <span
              className={`inline-block px-1 py-0.5 text-[6px] font-mono font-bold uppercase tracking-wider border ${statusColor(e.type)}`}
            >
              {e.type}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
