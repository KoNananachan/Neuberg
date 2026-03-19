import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useEquityAnalystRevisions } from '../../api/hooks/use-equity-analyst-revisions';
import { RefreshCw } from 'lucide-react';

// ── Types ──

type TabKey = 'revisions' | 'momentum' | 'ratings' | 'sectors' | 'surprises';

interface RevisionStock {
  symbol: string;
  epsCurrentFY: number | null;
  epsNextFY: number | null;
  rev30D: number | null;
  rev60D: number | null;
  rev90D: number | null;
  numUp: number;
  numDown: number;
}

interface MomentumStock {
  symbol: string;
  revisionMomentum: number;
  rank: number;
  direction: 'positive' | 'negative';
}

interface RatingEntry {
  symbol: string;
  buyCount: number;
  holdCount: number;
  sellCount: number;
  avgTarget: number | null;
  upsidePct: number | null;
  recentChange: 'upgrade' | 'downgrade' | null;
  recentChangeDate: string | null;
}

interface SectorEntry {
  sector: string;
  avgRevision: number;
  rank: number;
}

interface SurpriseQuarter {
  quarter: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprisePct: number | null;
  beat: boolean;
}

interface SurpriseEntry {
  symbol: string;
  quarters: SurpriseQuarter[];
}

interface EquityAnalystRevisionsData {
  revisions: RevisionStock[];
  momentum: {
    positive: MomentumStock[];
    negative: MomentumStock[];
  };
  ratings: RatingEntry[];
  sectors: SectorEntry[];
  surprises: SurpriseEntry[];
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

function fmtDollar(n: number | null | undefined, decimals = 0): string {
  if (n == null) return '-';
  return `$${n.toFixed(decimals)}`;
}

function pctColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral/50';
  return n >= 0 ? 'text-green-400' : 'text-red-400';
}

// ── Tab definitions ──

const TABS: { key: TabKey; label: string }[] = [
  { key: 'revisions', label: 'REVISIONS' },
  { key: 'momentum', label: 'MOMENTUM' },
  { key: 'ratings', label: 'RATINGS' },
  { key: 'sectors', label: 'SECTORS' },
  { key: 'surprises', label: 'SURPRISES' },
];

// ── Revisions Tab ──

function RevisionsTable({ data }: { data: RevisionStock[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral/30 text-[9px] font-mono uppercase tracking-wider">
        No revision data available
      </div>
    );
  }

  return (
    <div className="border border-border/20 overflow-auto">
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SYMBOL</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS CUR FY</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">EPS NXT FY</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">30D REV</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">60D REV</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">90D REV</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium"># UP</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium"># DOWN</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.symbol} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
              <td className="px-1.5 py-1 text-lime-400 font-bold">{r.symbol}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(r.epsCurrentFY)}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtNum(r.epsNextFY)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.rev30D)}`}>{fmtPct(r.rev30D)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.rev60D)}`}>{fmtPct(r.rev60D)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.rev90D)}`}>{fmtPct(r.rev90D)}</td>
              <td className="text-right px-1.5 py-1 text-green-400">{r.numUp}</td>
              <td className="text-right px-1.5 py-1 text-red-400">{r.numDown}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Momentum Tab ──

function MomentumSection({ positive, negative }: { positive: MomentumStock[]; negative: MomentumStock[] }) {
  if (positive.length === 0 && negative.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral/30 text-[9px] font-mono uppercase tracking-wider">
        No momentum data available
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Positive Momentum */}
      <div className="border border-border/20">
        <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
          <span className="text-[8px] font-mono text-green-400 uppercase tracking-wider font-medium">
            POSITIVE MOMENTUM
          </span>
        </div>
        {positive.length === 0 ? (
          <div className="px-2 py-3 text-neutral/30 text-[9px] font-mono text-center">-</div>
        ) : (
          <table className="w-full text-[9px] font-mono whitespace-nowrap">
            <thead>
              <tr className="bg-white/[0.03] border-b border-border/20">
                <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">RANK</th>
                <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SYMBOL</th>
                <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">MOMENTUM</th>
              </tr>
            </thead>
            <tbody>
              {positive.map((m) => (
                <tr key={m.symbol} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
                  <td className="px-1.5 py-1 text-neutral/50">{m.rank}</td>
                  <td className="px-1.5 py-1 text-lime-400 font-bold">{m.symbol}</td>
                  <td className="text-right px-1.5 py-1 text-green-400 font-bold">{fmtPct(m.revisionMomentum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Negative Momentum */}
      <div className="border border-border/20">
        <div className="px-2 py-1 border-b border-border/20 bg-white/[0.02]">
          <span className="text-[8px] font-mono text-red-400 uppercase tracking-wider font-medium">
            NEGATIVE MOMENTUM
          </span>
        </div>
        {negative.length === 0 ? (
          <div className="px-2 py-3 text-neutral/30 text-[9px] font-mono text-center">-</div>
        ) : (
          <table className="w-full text-[9px] font-mono whitespace-nowrap">
            <thead>
              <tr className="bg-white/[0.03] border-b border-border/20">
                <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">RANK</th>
                <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SYMBOL</th>
                <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">MOMENTUM</th>
              </tr>
            </thead>
            <tbody>
              {negative.map((m) => (
                <tr key={m.symbol} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
                  <td className="px-1.5 py-1 text-neutral/50">{m.rank}</td>
                  <td className="px-1.5 py-1 text-lime-400 font-bold">{m.symbol}</td>
                  <td className="text-right px-1.5 py-1 text-red-400 font-bold">{fmtPct(m.revisionMomentum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Ratings Tab ──

function RatingsTable({ data }: { data: RatingEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral/30 text-[9px] font-mono uppercase tracking-wider">
        No ratings data available
      </div>
    );
  }

  return (
    <div className="border border-border/20 overflow-auto">
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SYMBOL</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">BUY</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">HOLD</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SELL</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">AVG TARGET</th>
            <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">UPSIDE %</th>
            <th className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">RECENT</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.symbol} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
              <td className="px-1.5 py-1 text-lime-400 font-bold">{r.symbol}</td>
              <td className="text-right px-1.5 py-1 text-green-400">{r.buyCount}</td>
              <td className="text-right px-1.5 py-1 text-yellow-400">{r.holdCount}</td>
              <td className="text-right px-1.5 py-1 text-red-400">{r.sellCount}</td>
              <td className="text-right px-1.5 py-1 text-neutral/70">{fmtDollar(r.avgTarget)}</td>
              <td className={`text-right px-1.5 py-1 font-bold ${pctColor(r.upsidePct)}`}>{fmtPct(r.upsidePct, 1)}</td>
              <td className="text-center px-1.5 py-1">
                {r.recentChange === 'upgrade' && (
                  <span className="text-green-400 font-bold">UPGRADE</span>
                )}
                {r.recentChange === 'downgrade' && (
                  <span className="text-red-400 font-bold">DOWNGRADE</span>
                )}
                {!r.recentChange && (
                  <span className="text-neutral/30">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Sectors Tab ──

function SectorsTable({ data }: { data: SectorEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral/30 text-[9px] font-mono uppercase tracking-wider">
        No sector data available
      </div>
    );
  }

  const sorted = useMemo(() => [...data].sort((a, b) => b.avgRevision - a.avgRevision), [data]);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="flex flex-col gap-2">
      {/* Best / Worst summary */}
      <div className="grid grid-cols-2 gap-px bg-border/10 border border-border/20">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">BEST SECTOR</div>
          <div className="text-[11px] font-mono font-bold text-green-400">
            {best?.sector ?? '-'}
          </div>
          <div className="text-[9px] font-mono text-green-400">{fmtPct(best?.avgRevision)}</div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">WORST SECTOR</div>
          <div className="text-[11px] font-mono font-bold text-red-400">
            {worst?.sector ?? '-'}
          </div>
          <div className="text-[9px] font-mono text-red-400">{fmtPct(worst?.avgRevision)}</div>
        </div>
      </div>

      {/* Sector table */}
      <div className="border border-border/20 overflow-auto">
        <table className="w-full text-[9px] font-mono whitespace-nowrap">
          <thead>
            <tr className="bg-white/[0.03] border-b border-border/20">
              <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">RANK</th>
              <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SECTOR</th>
              <th className="text-right px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">AVG REVISION</th>
              <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium w-[120px]">BAR</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const maxAbs = Math.max(...data.map((d) => Math.abs(d.avgRevision)), 0.01);
              const barPct = Math.abs(s.avgRevision) / maxAbs * 100;
              const isPositive = s.avgRevision >= 0;

              return (
                <tr key={s.sector} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
                  <td className="px-1.5 py-1 text-neutral/50">{i + 1}</td>
                  <td className="px-1.5 py-1 text-lime-400 font-medium">{s.sector}</td>
                  <td className={`text-right px-1.5 py-1 font-bold ${pctColor(s.avgRevision)}`}>
                    {fmtPct(s.avgRevision)}
                  </td>
                  <td className="px-1.5 py-1">
                    <div className="h-[6px] bg-white/[0.04] relative w-full">
                      <div
                        className={`absolute top-0 h-full ${isPositive ? 'bg-green-400/60 left-1/2' : 'bg-red-400/60 right-1/2'}`}
                        style={{ width: `${barPct / 2}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Surprises Tab ──

function SurprisesTable({ data }: { data: SurpriseEntry[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-neutral/30 text-[9px] font-mono uppercase tracking-wider">
        No surprise data available
      </div>
    );
  }

  return (
    <div className="border border-border/20 overflow-auto">
      <table className="w-full text-[9px] font-mono whitespace-nowrap">
        <thead>
          <tr className="bg-white/[0.03] border-b border-border/20">
            <th className="text-left px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium">SYMBOL</th>
            {[0, 1, 2, 3].map((i) => (
              <th key={i} className="text-center px-1.5 py-1 text-neutral/40 uppercase tracking-wider font-medium" colSpan={2}>
                Q{i + 1}
              </th>
            ))}
          </tr>
          <tr className="bg-white/[0.02] border-b border-border/20">
            <th className="px-1.5 py-0.5" />
            {[0, 1, 2, 3].map((i) => (
              <th key={`sub-${i}`} colSpan={2} className="text-center px-1.5 py-0.5 text-[7px] text-neutral/30 uppercase tracking-wider font-medium">
                BEAT/MISS | MAG
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((entry) => (
            <tr key={entry.symbol} className="border-b border-border/10 hover:bg-lime-400/[0.02]">
              <td className="px-1.5 py-1 text-lime-400 font-bold">{entry.symbol}</td>
              {[0, 1, 2, 3].map((qi) => {
                const q = entry.quarters[qi];
                if (!q) {
                  return (
                    <td key={qi} colSpan={2} className="text-center px-1.5 py-1 text-neutral/20">-</td>
                  );
                }
                const color = q.beat ? 'text-green-400' : 'text-red-400';
                const label = q.beat ? 'BEAT' : 'MISS';
                return (
                  <td key={qi} colSpan={2} className={`text-center px-1.5 py-1 font-bold ${color}`}>
                    {label} {q.surprisePct != null ? fmtPct(q.surprisePct, 1) : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function EquityAnalystRevisionsPanel() {
  const { data: rawData, isLoading, refetch } = useEquityAnalystRevisions();
  const [activeTab, setActiveTab] = useState<TabKey>('revisions');

  const data = useMemo(() => rawData as EquityAnalystRevisionsData | undefined, [rawData]);

  // Loading state
  if (isLoading && !data) {
    return (
      <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            EQUITY ANALYST REVISIONS
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-lime-400/30 border-t-lime-400 animate-spin" />
        </div>
      </GlassCard>
    );
  }

  // Error state
  if (!data) {
    return (
      <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20">
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            EQUITY ANALYST REVISIONS
          </span>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-lime-400 transition-colors"
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

  // Empty state
  if (!data) return null;

  return (
    <GlassCard className="flex flex-col h-full bg-black text-[9px] font-mono">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 shrink-0">
        <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
          EQUITY ANALYST REVISIONS
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-lime-400 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border/20 shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-auto min-h-0 px-2 py-2">
        {activeTab === 'revisions' && (
          <RevisionsTable data={data.revisions ?? []} />
        )}

        {activeTab === 'momentum' && (
          <MomentumSection
            positive={data.momentum?.positive ?? []}
            negative={data.momentum?.negative ?? []}
          />
        )}

        {activeTab === 'ratings' && (
          <RatingsTable data={data.ratings ?? []} />
        )}

        {activeTab === 'sectors' && (
          <SectorsTable data={data.sectors ?? []} />
        )}

        {activeTab === 'surprises' && (
          <SurprisesTable data={data.surprises ?? []} />
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-border/20 text-[8px] font-mono text-neutral/30 shrink-0">
        <span>
          {data.revisions?.length ?? 0} stocks tracked
        </span>
        <span>
          {data.sectors?.length ?? 0} sectors | {data.surprises?.length ?? 0} surprises
        </span>
      </div>
    </GlassCard>
  );
}
