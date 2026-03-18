import { useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useEarningsWhisper } from '../../api/hooks/use-earnings-whisper';
import { RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

// ── i18n helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Types ──

interface UpcomingEarning {
  ticker: string;
  name: string;
  sector: string;
  reportDate: string;
  reportTime: string;
  consensusEps: number | null;
  whisperEps: number | null;
  revenueConsensus: number | null;
  revenueWhisper: number | null;
  whisperVsConsensus: number | null;
  historicalBeatRate: number | null;
  avgSurprise: number | null;
  impliedMove: number | null;
  prevQuarterSurprise: number | null;
  analystCount: number | null;
  highEst: number | null;
  lowEst: number | null;
}

interface RecentResult {
  ticker: string;
  name: string;
  reportedEps: number | null;
  consensusEps: number | null;
  surprise: number | null;
  revenueReported: number | null;
  revenueConsensus: number | null;
  revenueSurprise: number | null;
  reaction: number | null;
  guidance: string | null;
}

interface SeasonStats {
  totalReported: number;
  beatRate: number | null;
  missRate: number | null;
  inlineRate: number | null;
  avgSurprise: number | null;
  medianReaction: number | null;
  revenueBeatRate: number | null;
}

interface EarningsWhisperData {
  upcoming: UpcomingEarning[];
  recentResults: RecentResult[];
  seasonStats: SeasonStats;
  summary: {
    upcomingCount: number;
    avgImpliedMove: number | null;
    highestImpliedMove: number | null;
    avgWhisperVsConsensus: number | null;
    marketCapReporting: number | null;
  };
}

// ── Formatting helpers ──

function fmtPct(n: number | null, decimals = 1): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtEps(n: number | null): string {
  if (n == null) return '-';
  return n.toFixed(2);
}

function fmtLargeNum(n: number | null): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

function pctColor(n: number | null): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

// ── Season Stats Bar ──

function SeasonStatsBar({ stats }: { stats: SeasonStats }) {
  const items: Array<{ label: string; value: string; color: string }> = [
    {
      label: 'REPORTED',
      value: `${stats.totalReported}`,
      color: 'text-yellow-400',
    },
    {
      label: 'BEAT RATE',
      value: stats.beatRate != null ? `${stats.beatRate.toFixed(1)}%` : '-',
      color: stats.beatRate != null && stats.beatRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'MISS RATE',
      value: stats.missRate != null ? `${stats.missRate.toFixed(1)}%` : '-',
      color: stats.missRate != null && stats.missRate > 30 ? 'text-red-400' : 'text-neutral/60',
    },
    {
      label: 'INLINE',
      value: stats.inlineRate != null ? `${stats.inlineRate.toFixed(1)}%` : '-',
      color: 'text-neutral/60',
    },
    {
      label: 'AVG SURPRISE',
      value: stats.avgSurprise != null ? fmtPct(stats.avgSurprise) : '-',
      color: pctColor(stats.avgSurprise),
    },
    {
      label: 'MED REACTION',
      value: stats.medianReaction != null ? fmtPct(stats.medianReaction) : '-',
      color: pctColor(stats.medianReaction),
    },
    {
      label: 'REV BEAT',
      value: stats.revenueBeatRate != null ? `${stats.revenueBeatRate.toFixed(1)}%` : '-',
      color: stats.revenueBeatRate != null && stats.revenueBeatRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="grid grid-cols-7 gap-px bg-yellow-400/[0.05]">
      {items.map((item) => (
        <div key={item.label} className="bg-black px-1.5 py-1">
          <div className="text-[7px] font-mono text-neutral/40 uppercase tracking-wider truncate">{item.label}</div>
          <div className={`text-[10px] font-mono font-bold ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Upcoming Earnings Table ──

function UpcomingTable({ upcoming }: { upcoming: UpcomingEarning[] }) {
  const sorted = useMemo(
    () => [...upcoming].sort((a, b) => a.reportDate.localeCompare(b.reportDate)),
    [upcoming]
  );

  if (sorted.length === 0) {
    return (
      <div className="text-center text-neutral/30 text-[9px] font-mono py-4 uppercase tracking-wider">
        NO UPCOMING EARNINGS
      </div>
    );
  }

  const HIGH_IMPLIED_MOVE = 5;

  return (
    <div className="border border-yellow-400/10 overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="border-b border-yellow-400/20 bg-yellow-400/[0.03]">
            <th className="text-left px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Ticker</th>
            <th className="text-left px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Report</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Cons EPS</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Whisper</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">W vs C</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Impl Move</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Beat%</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Avg Surp</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Analysts</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => {
            const whisperHigher = row.whisperEps != null && row.consensusEps != null && row.whisperEps > row.consensusEps;
            const whisperLower = row.whisperEps != null && row.consensusEps != null && row.whisperEps < row.consensusEps;
            const highImplied = row.impliedMove != null && Math.abs(row.impliedMove) >= HIGH_IMPLIED_MOVE;

            return (
              <tr
                key={row.ticker}
                className="border-b border-yellow-400/[0.06] hover:bg-yellow-400/[0.02]"
              >
                <td className="px-1.5 py-1">
                  <span className="text-yellow-400 font-bold">{row.ticker}</span>
                </td>
                <td className="px-1.5 py-1 text-neutral/60 whitespace-nowrap">
                  {row.reportDate} <span className="text-neutral/30">{row.reportTime}</span>
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/60">{fmtEps(row.consensusEps)}</td>
                <td className={`text-right px-1.5 py-1 font-bold ${
                  whisperHigher ? 'text-green-400' : whisperLower ? 'text-red-400' : 'text-neutral/60'
                }`}>
                  {fmtEps(row.whisperEps)}
                </td>
                <td className={`text-right px-1.5 py-1 ${pctColor(row.whisperVsConsensus)}`}>
                  {fmtPct(row.whisperVsConsensus)}
                </td>
                <td className={`text-right px-1.5 py-1 ${
                  highImplied ? 'text-yellow-400 font-bold' : 'text-neutral/60'
                }`}>
                  {row.impliedMove != null ? `${row.impliedMove.toFixed(1)}%` : '-'}
                </td>
                <td className={`text-right px-1.5 py-1 ${
                  row.historicalBeatRate != null && row.historicalBeatRate >= 50
                    ? 'text-green-400' : row.historicalBeatRate != null ? 'text-red-400' : 'text-neutral/50'
                }`}>
                  {row.historicalBeatRate != null ? `${row.historicalBeatRate.toFixed(0)}%` : '-'}
                </td>
                <td className={`text-right px-1.5 py-1 ${pctColor(row.avgSurprise)}`}>
                  {fmtPct(row.avgSurprise)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {row.analystCount ?? '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Recent Results Table ──

function GuidanceBadge({ guidance }: { guidance: string | null }) {
  if (!guidance) return <span className="text-neutral/30">-</span>;

  const lower = guidance.toLowerCase();
  let cls = 'text-neutral/50 border-neutral/20 bg-white/[0.02]';
  if (lower === 'above' || lower === 'raised') {
    cls = 'text-green-400 border-green-500/30 bg-green-500/[0.06]';
  } else if (lower === 'below' || lower === 'lowered') {
    cls = 'text-red-400 border-red-500/30 bg-red-500/[0.06]';
  } else if (lower === 'inline' || lower === 'in-line' || lower === 'maintained') {
    cls = 'text-neutral/50 border-neutral/20 bg-white/[0.02]';
  }

  return (
    <span className={`px-1 py-0 text-[8px] font-mono uppercase tracking-wider border ${cls}`}>
      {guidance}
    </span>
  );
}

function RecentResultsTable({ results }: { results: RecentResult[] }) {
  if (results.length === 0) {
    return (
      <div className="text-center text-neutral/30 text-[9px] font-mono py-4 uppercase tracking-wider">
        NO RECENT RESULTS
      </div>
    );
  }

  return (
    <div className="border border-yellow-400/10 overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead>
          <tr className="border-b border-yellow-400/20 bg-yellow-400/[0.03]">
            <th className="text-left px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Ticker</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Reported</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Consensus</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">EPS Surp%</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Rev Surp%</th>
            <th className="text-right px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Reaction</th>
            <th className="text-center px-1.5 py-1 text-yellow-400/60 uppercase tracking-wider font-medium whitespace-nowrap">Guidance</th>
          </tr>
        </thead>
        <tbody>
          {results.map((row) => {
            const beat = row.surprise != null && row.surprise >= 0;

            return (
              <tr
                key={row.ticker}
                className="border-b border-yellow-400/[0.06] hover:bg-yellow-400/[0.02]"
              >
                <td className="px-1.5 py-1">
                  <span className={`font-bold ${beat ? 'text-green-400' : 'text-red-400'}`}>{row.ticker}</span>
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${beat ? 'text-green-400' : 'text-red-400'}`}>
                  {fmtEps(row.reportedEps)}
                </td>
                <td className="text-right px-1.5 py-1 text-neutral/50">
                  {fmtEps(row.consensusEps)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${pctColor(row.surprise)}`}>
                  {fmtPct(row.surprise)}
                </td>
                <td className={`text-right px-1.5 py-1 ${pctColor(row.revenueSurprise)}`}>
                  {fmtPct(row.revenueSurprise)}
                </td>
                <td className={`text-right px-1.5 py-1 font-bold ${pctColor(row.reaction)}`}>
                  {fmtPct(row.reaction)}
                </td>
                <td className="text-center px-1.5 py-1">
                  <GuidanceBadge guidance={row.guidance} />
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

export function EarningsWhisperPanel() {
  const t = useT();
  const { data, isLoading, refetch, dataUpdatedAt } = useEarningsWhisper();

  const whisperData = data as EarningsWhisperData | undefined;

  return (
    <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-yellow-400/30">
        <span className="text-[10px] font-mono font-bold tracking-widest text-yellow-400 uppercase">
          {tr(t, 'panelEarningsWhisper', 'EARNINGS WHISPER')}
        </span>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-yellow-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !whisperData ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[9px] font-mono text-yellow-400/60 uppercase tracking-widest">
              LOADING...
            </span>
          </div>
        ) : !whisperData ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[9px] font-mono uppercase tracking-widest">
            {tr(t, 'ewNoData', 'NO DATA AVAILABLE')}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* ── Season Stats Bar ── */}
            <div className="border-b border-yellow-400/10">
              <SeasonStatsBar stats={whisperData.seasonStats} />
            </div>

            {/* ── Summary Bar ── */}
            <div className="flex items-center gap-3 px-3 py-1 border-b border-yellow-400/10 bg-yellow-400/[0.02]">
              <span className="text-neutral/40">
                UPCOMING: <span className="text-yellow-400 font-bold">{whisperData.summary.upcomingCount}</span>
              </span>
              <span className="text-neutral/40">
                AVG IMPL MOVE: <span className="text-neutral/70">{whisperData.summary.avgImpliedMove != null ? `${whisperData.summary.avgImpliedMove.toFixed(1)}%` : '-'}</span>
              </span>
              <span className="text-neutral/40">
                HIGH IMPL: <span className="text-yellow-400 font-bold">{whisperData.summary.highestImpliedMove != null ? `${whisperData.summary.highestImpliedMove.toFixed(1)}%` : '-'}</span>
              </span>
              <span className="text-neutral/40">
                W VS C: <span className={pctColor(whisperData.summary.avgWhisperVsConsensus)}>{fmtPct(whisperData.summary.avgWhisperVsConsensus)}</span>
              </span>
              {whisperData.summary.marketCapReporting != null && (
                <span className="text-neutral/40">
                  MKTCAP: <span className="text-neutral/70">{fmtLargeNum(whisperData.summary.marketCapReporting)}</span>
                </span>
              )}
            </div>

            {/* ── Upcoming Earnings ── */}
            <div className="px-3 pt-2 pb-1">
              <div className="text-[8px] font-mono text-yellow-400/50 uppercase tracking-widest mb-1">
                {tr(t, 'ewUpcoming', 'UPCOMING EARNINGS')}
              </div>
            </div>
            <div className="px-3 pb-2">
              <UpcomingTable upcoming={whisperData.upcoming} />
            </div>

            {/* ── Recent Results ── */}
            <div className="px-3 pt-1 pb-1">
              <div className="text-[8px] font-mono text-yellow-400/50 uppercase tracking-widest mb-1">
                {tr(t, 'ewRecent', 'RECENT RESULTS')}
              </div>
            </div>
            <div className="px-3 pb-2">
              <RecentResultsTable results={whisperData.recentResults} />
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-yellow-400/20 text-[8px] font-mono text-neutral/30">
        <span>
          {whisperData?.upcoming.length ?? 0} {tr(t, 'ewUpcomingLabel', 'upcoming')} / {whisperData?.recentResults.length ?? 0} {tr(t, 'ewReportedLabel', 'reported')}
        </span>
        <span>
          {whisperData?.seasonStats.beatRate != null && (
            <>SEASON BEAT RATE: <span className={whisperData.seasonStats.beatRate >= 50 ? 'text-green-400' : 'text-red-400'}>{whisperData.seasonStats.beatRate.toFixed(1)}%</span></>
          )}
        </span>
      </div>
    </GlassCard>
  );
}
