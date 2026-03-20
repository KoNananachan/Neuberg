import { useProxyVoting } from '../../api/hooks/use-proxy-voting';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtPct(n: number): string {
  return n.toFixed(1);
}

function fmtChg(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtYears(n: number): string {
  return n.toFixed(1);
}

// -- Color helpers --

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function outcomeColor(outcome: string): string {
  const o = outcome.toUpperCase();
  if (o === 'PASSED' || o === 'APPROVED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (o === 'FAILED' || o === 'REJECTED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  if (o === 'PENDING') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function issRecColor(rec: string): string {
  const r = rec.toUpperCase();
  if (r === 'FOR') return 'text-green-400';
  if (r === 'AGAINST') return 'text-red-400';
  if (r === 'WITHHOLD') return 'text-yellow-400';
  return 'text-neutral-500';
}

function supportColor(pct: number): string {
  if (pct >= 70) return 'text-green-400';
  if (pct >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-neutral-400';
  return 'text-red-400';
}

function scoreBarColor(score: number): string {
  if (score >= 80) return 'bg-green-400';
  if (score >= 60) return 'bg-yellow-400';
  if (score >= 40) return 'bg-neutral-500';
  return 'bg-red-400';
}

// -- Interfaces --

interface UpcomingMeeting {
  company: string;
  date: string;
  keyProposals: string;
  issRec: string;
}

interface ProxyFight {
  company: string;
  activist: string;
  stake: number;
  demands: string;
}

interface VotingResult {
  company: string;
  proposal: string;
  forPct: number;
  againstPct: number;
  outcome: string;
}

interface EsgProposal {
  company: string;
  proposal: string;
  category: string;
  support: number;
  trend1y: number;
}

interface SayOnPay {
  company: string;
  ceoComp: string;
  support: number;
  priorYear: number;
  change: number;
}

interface BoardMetric {
  metric: string;
  value: string;
  benchmark: string;
  percentile: number;
}

interface GovernanceScore {
  provider: string;
  score: number;
  maxScore: number;
  rank: string;
  change: number;
}

// -- Main Panel --

export function ProxyVotingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useProxyVoting();

  const meetings = data?.upcomingMeetings as UpcomingMeeting[] | undefined;
  const proxyFights = data?.proxyFights as ProxyFight[] | undefined;
  const votingResults = data?.votingResults as VotingResult[] | undefined;
  const esgProposals = data?.esgProposals as EsgProposal[] | undefined;
  const sayOnPay = data?.sayOnPay as SayOnPay[] | undefined;
  const boardMetrics = data?.boardMetrics as BoardMetric[] | undefined;
  const governanceScores = data?.governanceScores as GovernanceScore[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-violet-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-violet-400">
            {tr(t, 'panelProxyVoting', 'Proxy Voting')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'proxyNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {meetings && meetings.length > 0 && (
              <UpcomingMeetingsSection meetings={meetings} t={t} />
            )}
            {proxyFights && proxyFights.length > 0 && (
              <ProxyFightsSection fights={proxyFights} t={t} />
            )}
            {votingResults && votingResults.length > 0 && (
              <VotingResultsSection results={votingResults} t={t} />
            )}
            {esgProposals && esgProposals.length > 0 && (
              <EsgProposalsSection proposals={esgProposals} t={t} />
            )}
            {sayOnPay && sayOnPay.length > 0 && (
              <SayOnPaySection votes={sayOnPay} t={t} />
            )}
            {boardMetrics && boardMetrics.length > 0 && (
              <BoardMetricsSection metrics={boardMetrics} t={t} />
            )}
            {governanceScores && governanceScores.length > 0 && (
              <GovernanceScoresSection scores={governanceScores} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Upcoming Meetings Section --

function UpcomingMeetingsSection({
  meetings,
  t,
}: {
  meetings: UpcomingMeeting[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyUpcomingMeetings', 'Upcoming Meetings')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_1fr_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyDate', 'Date')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pl-2">
          {tr(t, 'proxyKeyProposals', 'Key Proposals')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyIssRec', 'ISS Rec')}
        </span>
      </div>

      {/* Rows */}
      {meetings.map((m, i) => (
        <div
          key={`${m.company}-${m.date}-${i}`}
          className="grid grid-cols-[1fr_64px_1fr_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {m.company}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {m.date}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 pl-2 truncate">
            {m.keyProposals}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${issRecColor(m.issRec)}`}>
            {m.issRec}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Proxy Fights / Hot Contests Section --

function ProxyFightsSection({
  fights,
  t,
}: {
  fights: ProxyFight[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyHotContests', 'Hot Contests / Proxy Fights')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_1fr_56px_1fr] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyActivist', 'Activist')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyStake', 'Stake %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pl-2">
          {tr(t, 'proxyDemands', 'Demands')}
        </span>
      </div>

      {/* Rows */}
      {fights.map((f, i) => (
        <div
          key={`${f.company}-${f.activist}-${i}`}
          className="grid grid-cols-[1fr_1fr_56px_1fr] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {f.company}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {f.activist}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtPct(f.stake)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 pl-2 truncate">
            {f.demands}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Voting Results Section --

function VotingResultsSection({
  results,
  t,
}: {
  results: VotingResult[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyVotingResults', 'Voting Results')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyProposal', 'Proposal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyFor', 'For %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyAgainst', 'Against %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyOutcome', 'Outcome')}
        </span>
      </div>

      {/* Rows */}
      {results.map((r, i) => (
        <div
          key={`${r.company}-${r.proposal}-${i}`}
          className="grid grid-cols-[80px_1fr_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {r.company}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {r.proposal}
          </span>
          <span className="text-[8px] font-mono font-bold text-green-400 text-right">
            {fmtPct(r.forPct)}
          </span>
          <span className="text-[8px] font-mono font-bold text-red-400 text-right">
            {fmtPct(r.againstPct)}
          </span>
          <span className="text-right pr-2">
            <span
              className={`inline-block px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border ${outcomeColor(r.outcome)}`}
            >
              {r.outcome}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// -- ESG Proposals Section --

function EsgProposalsSection({
  proposals,
  t,
}: {
  proposals: EsgProposal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyEsgProposals', 'ESG Proposals')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[80px_1fr_64px_56px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyProposal', 'Proposal')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCategory', 'Category')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxySupport', 'Support %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyTrend1y', '1Y Trend')}
        </span>
      </div>

      {/* Rows */}
      {proposals.map((p, i) => (
        <div
          key={`${p.company}-${p.proposal}-${i}`}
          className="grid grid-cols-[80px_1fr_64px_56px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {p.company}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 truncate">
            {p.proposal}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 truncate">
            {p.category}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-10 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-violet-400"
                style={{ width: `${Math.min(p.support, 100)}%` }}
              />
            </div>
            <span className={`text-[8px] font-mono font-bold w-8 text-right ${supportColor(p.support)}`}>
              {fmtPct(p.support)}
            </span>
          </div>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(p.trend1y)}`}>
            {fmtChg(p.trend1y)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Say on Pay Section --

function SayOnPaySection({
  votes,
  t,
}: {
  votes: SayOnPay[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxySayOnPay', 'Say on Pay')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_72px_56px_56px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyCompany', 'Company')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyCeoComp', 'CEO Comp')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxySupport', 'Support %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyPriorYr', 'Prior Yr')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyChange', 'Chg')}
        </span>
      </div>

      {/* Rows */}
      {votes.map((v, i) => (
        <div
          key={`${v.company}-${i}`}
          className="grid grid-cols-[1fr_72px_56px_56px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {v.company}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right truncate">
            {v.ceoComp}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${supportColor(v.support)}`}>
            {fmtPct(v.support)}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {fmtPct(v.priorYear)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(v.change)}`}>
            {fmtChg(v.change)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Board Metrics Section --

function BoardMetricsSection({
  metrics,
  t,
}: {
  metrics: BoardMetric[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-violet-400/30">
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyBoardMetrics', 'Board Metrics')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_48px_64px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyMetric', 'Metric')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyValue', 'Value')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyBenchmark', 'Benchmark')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyPctile', '%ile')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyRange', 'Range')}
        </span>
      </div>

      {/* Rows */}
      {metrics.map((m, i) => (
        <div
          key={`${m.metric}-${i}`}
          className="grid grid-cols-[1fr_64px_64px_48px_64px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">
            {m.metric}
          </span>
          <span className="text-[8px] font-mono font-bold text-violet-400 text-right">
            {m.value}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {m.benchmark}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${scoreColor(m.percentile)}`}>
            {m.percentile}
          </span>
          <div className="flex items-center gap-1 justify-end pr-2">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className={`absolute top-0 left-0 h-full ${scoreBarColor(m.percentile)}`}
                style={{ width: `${Math.min(m.percentile, 100)}%` }}
              />
              <div
                className="absolute top-[-1px] w-[2px] h-[8px] bg-white"
                style={{ left: `${Math.min(m.percentile, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// -- Governance Scores Section --

function GovernanceScoresSection({
  scores,
  t,
}: {
  scores: GovernanceScore[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-violet-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'proxyGovernanceScores', 'Governance Scores')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_56px_48px] gap-0 px-2 py-0.5 border-b border-violet-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'proxyProvider', 'Provider')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyScore', 'Score')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyMax', 'Max')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'proxyRank', 'Rank')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'proxyChg', 'Chg')}
        </span>
      </div>

      {/* Rows */}
      {scores.map((s, i) => (
        <div
          key={`${s.provider}-${i}`}
          className="grid grid-cols-[1fr_56px_48px_56px_48px] gap-0 px-2 py-[3px] border-b border-violet-400/5 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-violet-400 truncate">
            {s.provider}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${scoreColor(s.score)}`}>
            {s.score}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right">
            {s.maxScore}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {s.rank}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(s.change)}`}>
            {fmtChg(s.change)}
          </span>
        </div>
      ))}
    </div>
  );
}
