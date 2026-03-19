import { useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useEarningsRevision } from '../../api/hooks/use-earnings-revision';
import { RefreshCw, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// ── Types (shape from API) ──

interface UpRevision {
  ticker: string;
  name: string;
  sector: string;
  currentEps: number;
  previousEps: number;
  revisionPct: number;
  analystCount: number;
  consensusRating: number;
  targetPrice: number;
  upsidePct: number;
}

interface DownRevision {
  ticker: string;
  name: string;
  sector: string;
  currentEps: number;
  previousEps: number;
  revisionPct: number;
  analystCount: number;
  consensusRating: number;
  targetPrice: number;
  upsidePct: number;
}

interface SectorRevision {
  sector: string;
  avgRevision3m: number;
  avgRevision1m: number;
  upgradeCount: number;
  downgradeCount: number;
  net: number;
  earningsGrowth: number;
}

interface EarningsSurprise {
  ticker: string;
  reportDate: string;
  epsEstimate: number;
  epsActual: number;
  surprisePct: number;
  revenueEstimate: number;
  revenueActual: number;
  revSurprisePct: number;
  priceReactionPct: number;
}

interface UpcomingEarning {
  ticker: string;
  date: string;
  epsEstimate: number;
  whisperNumber: number;
  impliedMovePct: number;
}

interface RevisionBreadth {
  upRevisions: number;
  downRevisions: number;
  breadthRatio: number;
  momentum: string;
}

interface SummaryBar {
  avgSpRevision: number;
  beatRate: number;
  avgSurprise: number;
  sectorLeader: string;
  sectorLaggard: string;
}

interface EarningsRevisionData {
  summary: SummaryBar;
  breadth: RevisionBreadth;
  topUpRevisions: UpRevision[];
  topDownRevisions: DownRevision[];
  sectorRevisions: SectorRevision[];
  earningsSurprises: EarningsSurprise[];
  upcomingEarnings: UpcomingEarning[];
}

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtDollar(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return `$${n.toFixed(decimals)}`;
}

function fmtRevenue(n: number | null | undefined): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

function ratingStars(rating: number): string {
  const clamped = Math.max(1, Math.min(5, Math.round(rating)));
  return '\u2605'.repeat(clamped) + '\u2606'.repeat(5 - clamped);
}

function momentumBadge(m: string): { text: string; cls: string } {
  const map: Record<string, { text: string; cls: string }> = {
    IMPROVING: { text: 'IMPROVING', cls: 'text-green-400 bg-green-500/10 border-green-500/30' },
    STABLE: { text: 'STABLE', cls: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
    DETERIORATING: { text: 'DETERIORATING', cls: 'text-red-400 bg-red-500/10 border-red-500/30' },
  };
  return map[m] || { text: m || '-', cls: 'text-neutral/50 bg-white/5 border-border/20' };
}

// ── Breadth Bar ──

function BreadthBar({ ratio }: { ratio: number }) {
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-[6px] bg-red-400/20 relative">
        <div
          className="absolute top-0 left-0 h-full bg-green-400/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[8px] font-mono text-neutral/50 w-8 text-right">
        {(ratio * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ── Summary Bar Section ──

function SummarySection({ summary, breadth }: { summary: SummaryBar; breadth: RevisionBreadth }) {
  const mom = momentumBadge(breadth.momentum);

  return (
    <div className="border border-border/20">
      {/* Top summary stats */}
      <div className="grid grid-cols-4 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">S&P 500 AVG REV</div>
          <div className={`text-[11px] font-mono font-bold ${pctColor(summary.avgSpRevision)}`}>
            {fmtPct(summary.avgSpRevision)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">BEAT RATE</div>
          <div className={`text-[11px] font-mono font-bold ${summary.beatRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
            {summary.beatRate.toFixed(1)}%
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">AVG SURPRISE</div>
          <div className={`text-[11px] font-mono font-bold ${pctColor(summary.avgSurprise)}`}>
            {fmtPct(summary.avgSurprise)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">LEADER / LAGGARD</div>
          <div className="text-[9px] font-mono">
            <span className="text-green-400">{summary.sectorLeader}</span>
            <span className="text-neutral/30"> / </span>
            <span className="text-red-400">{summary.sectorLaggard}</span>
          </div>
        </div>
      </div>

      {/* Breadth row */}
      <div className="grid grid-cols-4 gap-px bg-border/10 border-t border-border/20">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">UP REVISIONS</div>
          <div className="text-[11px] font-mono font-bold text-green-400">{breadth.upRevisions}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">DOWN REVISIONS</div>
          <div className="text-[11px] font-mono font-bold text-red-400">{breadth.downRevisions}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">BREADTH RATIO</div>
          <BreadthBar ratio={breadth.breadthRatio} />
        </div>
        <div className="bg-black px-2 py-1.5 flex items-center">
          <span className={`px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-wider border ${mom.cls}`}>
            {mom.text}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Top Up Revisions Table ──

function TopUpRevisionsTable({ data }: { data: UpRevision[] }) {
  return (
    <div className="border border-border/20 overflow-auto">
      <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
        <div className="flex items-center gap-1">
          <ArrowUpRight size={10} className="text-green-400" />
          <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider font-medium">
            TOP UP REVISIONS
          </span>
        </div>
      </div>
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Name</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Cur EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Prev EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev%</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">#Analysts</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rating</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Target</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Upside%</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((r) => (
            <tr key={r.ticker} className="border-b border-border/10 hover:bg-cyan-400/[0.02]">
              <td className="px-1.5 py-1 text-cyan-400 font-bold">{r.ticker}</td>
              <td className="px-1.5 py-1 text-neutral/60 max-w-[90px] truncate">{r.name}</td>
              <td className="px-1.5 py-1 text-neutral/40 text-[8px]">{r.sector}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(r.currentEps)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50">{fmtNum(r.previousEps)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.revisionPct)}`}>{fmtPct(r.revisionPct)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50">{r.analystCount}</td>
              <td className="text-center px-1.5 py-1 text-yellow-400 text-[8px]">{ratingStars(r.consensusRating)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/60">{fmtDollar(r.targetPrice, 0)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.upsidePct)}`}>{fmtPct(r.upsidePct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Top Down Revisions Table ──

function TopDownRevisionsTable({ data }: { data: DownRevision[] }) {
  return (
    <div className="border border-border/20 overflow-auto">
      <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
        <div className="flex items-center gap-1">
          <ArrowDownRight size={10} className="text-red-400" />
          <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider font-medium">
            TOP DOWN REVISIONS
          </span>
        </div>
      </div>
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Name</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Cur EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Prev EPS</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev%</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">#Analysts</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rating</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Target</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Upside%</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((r) => (
            <tr key={r.ticker} className="border-b border-border/10 hover:bg-cyan-400/[0.02]">
              <td className="px-1.5 py-1 text-cyan-400 font-bold">{r.ticker}</td>
              <td className="px-1.5 py-1 text-neutral/60 max-w-[90px] truncate">{r.name}</td>
              <td className="px-1.5 py-1 text-neutral/40 text-[8px]">{r.sector}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(r.currentEps)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50">{fmtNum(r.previousEps)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.revisionPct)}`}>{fmtPct(r.revisionPct)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/50">{r.analystCount}</td>
              <td className="text-center px-1.5 py-1 text-yellow-400 text-[8px]">{ratingStars(r.consensusRating)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/60">{fmtDollar(r.targetPrice, 0)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.upsidePct)}`}>{fmtPct(r.upsidePct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sector Revisions Table ──

function SectorRevisionsTable({ data }: { data: SectorRevision[] }) {
  return (
    <div className="border border-border/20 overflow-auto">
      <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider font-medium">
          SECTOR REVISIONS
        </span>
      </div>
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Sector</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">3M Rev</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">1M Rev</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Upgrades</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Downgrades</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Net</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Earn Growth</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 11).map((s) => (
            <tr key={s.sector} className="border-b border-border/10 hover:bg-cyan-400/[0.02]">
              <td className="px-1.5 py-1 text-cyan-400 font-medium">{s.sector}</td>
              <td className={`text-right px-1.5 py-1 ${pctColor(s.avgRevision3m)}`}>{fmtPct(s.avgRevision3m)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(s.avgRevision1m)}`}>{fmtPct(s.avgRevision1m)}</td>
              <td className="text-right px-1.5 py-1 text-green-400">{s.upgradeCount}</td>
              <td className="text-right px-1.5 py-1 text-red-400">{s.downgradeCount}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(s.net)}`}>
                {s.net > 0 ? '+' : ''}{s.net}
              </td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(s.earningsGrowth)}`}>{fmtPct(s.earningsGrowth)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Earnings Surprises Table ──

function EarningsSurprisesTable({ data }: { data: EarningsSurprise[] }) {
  return (
    <div className="border border-border/20 overflow-auto">
      <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider font-medium">
          EARNINGS SURPRISES
        </span>
      </div>
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Act</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Surp%</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Act</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Rev Surp%</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Price Rxn%</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 20).map((e, i) => (
            <tr key={`${e.ticker}-${i}`} className="border-b border-border/10 hover:bg-cyan-400/[0.02]">
              <td className="px-1.5 py-1 text-cyan-400 font-bold">{e.ticker}</td>
              <td className="px-1.5 py-1 text-neutral/50">{e.reportDate}</td>
              <td className="text-right px-1.5 py-1 text-neutral/60">{fmtNum(e.epsEstimate)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(e.epsActual - e.epsEstimate)}`}>{fmtNum(e.epsActual)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(e.surprisePct)}`}>{fmtPct(e.surprisePct)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/60">{fmtRevenue(e.revenueEstimate)}</td>
              <td className={`text-right px-1.5 py-1 ${pctColor(e.revenueActual - e.revenueEstimate)}`}>{fmtRevenue(e.revenueActual)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(e.revSurprisePct)}`}>{fmtPct(e.revSurprisePct)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(e.priceReactionPct)}`}>{fmtPct(e.priceReactionPct, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Upcoming Earnings Table ──

function UpcomingEarningsTable({ data }: { data: UpcomingEarning[] }) {
  return (
    <div className="border border-border/20 overflow-auto">
      <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
        <span className="text-[8px] font-mono text-neutral/40 uppercase tracking-wider font-medium">
          UPCOMING EARNINGS
        </span>
      </div>
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Ticker</th>
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Date</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS Est</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Whisper</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">Impl Move%</th>
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 15).map((e, i) => (
            <tr key={`${e.ticker}-${i}`} className="border-b border-border/10 hover:bg-cyan-400/[0.02]">
              <td className="px-1.5 py-1 text-cyan-400 font-bold">{e.ticker}</td>
              <td className="px-1.5 py-1 text-neutral/50">{e.date}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(e.epsEstimate)}</td>
              <td className={`text-right px-1.5 py-1 ${e.whisperNumber > e.epsEstimate ? 'text-green-400' : e.whisperNumber < e.epsEstimate ? 'text-red-400' : 'text-neutral/60'}`}>
                {fmtNum(e.whisperNumber)}
              </td>
              <td className="text-right px-1.5 py-1 text-yellow-400 font-bold">{'\u00B1'}{Math.abs(e.impliedMovePct).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function EarningsRevisionPanel() {
  const { data: rawData, isLoading, error, refetch, dataUpdatedAt } = useEarningsRevision();

  const data = useMemo(() => rawData as EarningsRevisionData | undefined, [rawData]);

  // Loading state
  if (isLoading && !data) {
    return (
      <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={12} className="text-cyan-400" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
              EARNINGS REVISION TRACKER
            </span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
          <div className="flex items-center gap-1.5">
            <TrendingDown size={12} className="text-red-400" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
              EARNINGS REVISION TRACKER
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-cyan-400 transition-colors"
            title="Retry"
          >
            <RefreshCw size={10} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-red-400/70 text-[10px] font-mono uppercase tracking-widest">
            Failed to load data
          </span>
        </div>
      </GlassCard>
    );
  }

  if (!data) return null;

  return (
    <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-cyan-400" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            EARNINGS REVISION TRACKER
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[8px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-cyan-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-auto min-h-0 px-2 py-2 flex flex-col gap-2">
        {/* Summary + Breadth */}
        {data.summary && data.breadth && (
          <SummarySection summary={data.summary} breadth={data.breadth} />
        )}

        {/* Top Up Revisions */}
        {data.topUpRevisions && data.topUpRevisions.length > 0 && (
          <TopUpRevisionsTable data={data.topUpRevisions} />
        )}

        {/* Top Down Revisions */}
        {data.topDownRevisions && data.topDownRevisions.length > 0 && (
          <TopDownRevisionsTable data={data.topDownRevisions} />
        )}

        {/* Sector Revisions */}
        {data.sectorRevisions && data.sectorRevisions.length > 0 && (
          <SectorRevisionsTable data={data.sectorRevisions} />
        )}

        {/* Earnings Surprises */}
        {data.earningsSurprises && data.earningsSurprises.length > 0 && (
          <EarningsSurprisesTable data={data.earningsSurprises} />
        )}

        {/* Upcoming Earnings */}
        {data.upcomingEarnings && data.upcomingEarnings.length > 0 && (
          <UpcomingEarningsTable data={data.upcomingEarnings} />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/20 text-[8px] font-mono text-neutral/30 shrink-0">
        <span>
          {data.topUpRevisions?.length ?? 0} up / {data.topDownRevisions?.length ?? 0} down revisions
        </span>
        <span>
          {data.earningsSurprises?.length ?? 0} surprises | {data.upcomingEarnings?.length ?? 0} upcoming
        </span>
      </div>
    </GlassCard>
  );
}
