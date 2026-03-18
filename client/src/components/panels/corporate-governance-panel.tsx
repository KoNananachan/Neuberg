import { useState, useMemo } from 'react';
import { GlassCard } from '../common/glass-card';
import { useCorporateGovernance } from '../../api/hooks/use-corporate-governance';
import { useT } from '../../i18n';
import { Shield } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GovernanceData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BoardMember = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CompensationEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ControversyEvent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProvisionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrendRow = any;

type Tab = 'scoreboard' | 'board' | 'compensation' | 'controversies' | 'provisions' | 'trends';

const TABS: { key: Tab; label: string }[] = [
  { key: 'scoreboard', label: 'Scoreboard' },
  { key: 'board', label: 'Board' },
  { key: 'compensation', label: 'Compensation' },
  { key: 'controversies', label: 'Controversies' },
  { key: 'provisions', label: 'Provisions' },
  { key: 'trends', label: 'Trends' },
];

function scoreColor(score: number | null | undefined): string {
  if (score == null) return 'bg-neutral/20';
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-lime-500';
  if (score >= 40) return 'bg-yellow-500';
  if (score >= 20) return 'bg-orange-500';
  return 'bg-red-500';
}

function scoreTextColor(score: number | null | undefined): string {
  if (score == null) return 'text-neutral/40';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-lime-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function formatPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(1) + '%';
}

function formatCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  if (Math.abs(n) >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
  return '$' + n.toLocaleString();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function impactColor(impact: number | null | undefined): string {
  if (impact == null) return 'text-neutral/40';
  if (impact > 0) return 'text-emerald-400';
  if (impact < 0) return 'text-red-400';
  return 'text-neutral/50';
}

function changeIndicator(val: number | null | undefined): string {
  if (val == null) return '--';
  const sign = val > 0 ? '+' : '';
  return sign + val.toFixed(1) + '%';
}

function changeColor(val: number | null | undefined): string {
  if (val == null) return 'text-neutral/40';
  if (val > 0) return 'text-emerald-400';
  if (val < 0) return 'text-red-400';
  return 'text-neutral/50';
}

// --- Tab content components ---

function ScoreboardTab({ data }: { data: GovernanceData }) {
  const companies = data?.scoreboard ?? [];

  if (!companies.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No governance data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Company</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Score</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Indep%</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Divers%</th>
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Flags</th>
          </tr>
        </thead>
        <tbody>
          {companies.slice(0, 15).map((c: GovernanceData, i: number) => (
            <tr
              key={c?.symbol ?? i}
              className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-indigo-400 text-[10px]">{c?.symbol ?? '--'}</span>
                  <span className="text-neutral/40 truncate max-w-[100px]">{c?.name ?? ''}</span>
                </div>
              </td>
              <td className="px-1 py-1.5 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <div className="w-10 h-1.5 bg-neutral/10 overflow-hidden">
                    <div
                      className={`h-full ${scoreColor(c?.score)}`}
                      style={{ width: `${Math.min(c?.score ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className={`tabular-nums font-bold ${scoreTextColor(c?.score)}`}>
                    {c?.score ?? '--'}
                  </span>
                </div>
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {formatPct(c?.independencePercent)}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {formatPct(c?.diversityPercent)}
              </td>
              <td className="px-2 py-1.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {c?.ceoDuality && (
                    <span className="px-1 py-px text-[7px] font-bold uppercase bg-amber-500/20 text-amber-400">
                      CEO Dual
                    </span>
                  )}
                  {c?.poisonPill && (
                    <span className="px-1 py-px text-[7px] font-bold uppercase bg-red-500/20 text-red-400">
                      Poison Pill
                    </span>
                  )}
                  {c?.staggeredBoard && (
                    <span className="px-1 py-px text-[7px] font-bold uppercase bg-violet-500/20 text-violet-400">
                      Staggered
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardTab({ data }: { data: GovernanceData }) {
  const companies = data?.board ?? [];

  if (!companies.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No board data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Company</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Size</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Indep</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Women</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Avg Tenure</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Avg Age</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Overboarded</th>
          </tr>
        </thead>
        <tbody>
          {companies.map((c: BoardMember, i: number) => (
            <tr
              key={c?.symbol ?? i}
              className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <span className="font-bold text-indigo-400 text-[10px]">{c?.symbol ?? '--'}</span>
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {c?.boardSize ?? '--'}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {c?.independentCount ?? '--'}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {c?.womenCount ?? '--'}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {c?.avgTenure != null ? c.avgTenure.toFixed(1) + 'y' : '--'}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                {c?.avgAge ?? '--'}
              </td>
              <td className="px-1 py-1.5 text-right">
                {c?.overboardedCount != null && c.overboardedCount > 0 ? (
                  <span className="text-amber-400 font-bold">{c.overboardedCount}</span>
                ) : (
                  <span className="text-neutral/40">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompensationTab({ data }: { data: GovernanceData }) {
  const entries = data?.compensation ?? [];

  if (!entries.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No compensation data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Rank</th>
            <th className="px-1 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Company</th>
            <th className="px-1 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">CEO</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Total</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Base</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Bonus</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Stock</th>
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Pay Ratio</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((c: CompensationEntry, i: number) => (
            <tr
              key={c?.symbol ?? i}
              className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5 text-neutral/40 tabular-nums">{i + 1}</td>
              <td className="px-1 py-1.5">
                <span className="font-bold text-indigo-400 text-[10px]">{c?.symbol ?? '--'}</span>
              </td>
              <td className="px-1 py-1.5 text-neutral/70 truncate max-w-[80px]">
                {c?.ceoName ?? '--'}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums font-bold text-white">
                {formatCompact(c?.totalComp)}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/60">
                {formatCompact(c?.baseSalary)}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/60">
                {formatCompact(c?.bonus)}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums text-neutral/60">
                {formatCompact(c?.stockAwards)}
              </td>
              <td className="px-1 py-1.5 text-right tabular-nums">
                {c?.payRatio != null ? (
                  <span className={c.payRatio > 300 ? 'text-red-400 font-bold' : 'text-neutral/60'}>
                    {c.payRatio.toFixed(0)}:1
                  </span>
                ) : (
                  <span className="text-neutral/40">--</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ControversiesTab({ data }: { data: GovernanceData }) {
  const events = data?.controversies ?? [];

  if (!events.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No controversies
      </div>
    );
  }

  const typeBadge = (type: string | null | undefined) => {
    const t = type?.toLowerCase() ?? '';
    if (t.includes('fraud')) return { bg: 'bg-red-500/20', text: 'text-red-400' };
    if (t.includes('lawsuit') || t.includes('legal')) return { bg: 'bg-orange-500/20', text: 'text-orange-400' };
    if (t.includes('exec') || t.includes('resign')) return { bg: 'bg-amber-500/20', text: 'text-amber-400' };
    if (t.includes('esg') || t.includes('environ')) return { bg: 'bg-teal-500/20', text: 'text-teal-400' };
    if (t.includes('restate') || t.includes('audit')) return { bg: 'bg-violet-500/20', text: 'text-violet-400' };
    return { bg: 'bg-neutral/10', text: 'text-neutral/60' };
  };

  return (
    <div className="flex-1 overflow-auto min-h-0">
      {events.map((e: ControversyEvent, i: number) => {
        const badge = typeBadge(e?.type);
        return (
          <div
            key={e?.id ?? i}
            className="px-3 py-2 border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[8px] text-neutral/40 tabular-nums font-mono">
                {formatDate(e?.date)}
              </span>
              <span className="font-bold text-indigo-400 text-[10px] font-mono">{e?.symbol ?? '--'}</span>
              <span className={`px-1 py-px text-[7px] font-bold uppercase ${badge.bg} ${badge.text}`}>
                {e?.type ?? 'OTHER'}
              </span>
              {e?.stockImpact != null && (
                <span className={`text-[8px] font-mono font-bold tabular-nums ml-auto ${impactColor(e.stockImpact)}`}>
                  {e.stockImpact > 0 ? '+' : ''}{e.stockImpact.toFixed(2)}%
                </span>
              )}
            </div>
            <p className="text-[9px] font-mono text-neutral/60 leading-relaxed">
              {e?.description ?? ''}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ProvisionsTab({ data }: { data: GovernanceData }) {
  const rows = data?.provisions ?? [];
  const measures = [
    'Poison Pill',
    'Staggered Board',
    'Supermajority',
    'Golden Parachute',
    'Dual Class',
    'No Cumulative Voting',
    'Blank Check Preferred',
  ];

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No provisions data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Company</th>
            {measures.map((m) => (
              <th key={m} className="px-1 py-1.5 text-center text-[7px] uppercase tracking-wider text-indigo-400 font-medium whitespace-nowrap">
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r: ProvisionRow, i: number) => (
            <tr
              key={r?.symbol ?? i}
              className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5">
                <span className="font-bold text-indigo-400 text-[10px]">{r?.symbol ?? '--'}</span>
              </td>
              {measures.map((m) => {
                const key = m.toLowerCase().replace(/\s+/g, '');
                const val = r?.[key];
                return (
                  <td key={m} className="px-1 py-1.5 text-center">
                    {val === true ? (
                      <span className="text-red-400 font-bold">X</span>
                    ) : val === false ? (
                      <span className="text-neutral/20">-</span>
                    ) : (
                      <span className="text-neutral/20">-</span>
                    )}
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

function TrendsTab({ data }: { data: GovernanceData }) {
  const rows = data?.trends ?? [];

  if (!rows.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
        No trend data
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black z-10">
          <tr className="border-b border-border/20">
            <th className="px-2 py-1.5 text-left text-[8px] uppercase tracking-wider text-indigo-400 font-medium">Metric</th>
            {(rows[0]?.years ?? []).map((y: number) => (
              <th key={y} className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium tabular-nums">
                {y}
              </th>
            ))}
            <th className="px-1 py-1.5 text-right text-[8px] uppercase tracking-wider text-indigo-400 font-medium">YoY</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: TrendRow, i: number) => (
            <tr
              key={r?.metric ?? i}
              className="border-b border-border/5 hover:bg-indigo-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1.5 text-neutral/70 uppercase text-[8px] tracking-wider">
                {r?.metric ?? '--'}
              </td>
              {(r?.values ?? []).map((v: number, vi: number) => (
                <td key={vi} className="px-1 py-1.5 text-right tabular-nums text-neutral/70">
                  {v != null ? (typeof v === 'number' && v < 1 ? formatPct(v * 100) : v.toFixed(1)) : '--'}
                </td>
              ))}
              <td className={`px-1 py-1.5 text-right tabular-nums font-bold ${changeColor(r?.yoyChange)}`}>
                {changeIndicator(r?.yoyChange)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --- Main component ---

export function CorporateGovernancePanel() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<Tab>('scoreboard');
  const { data, isLoading, error } = useCorporateGovernance();

  const tabContent = useMemo(() => {
    if (!data) return null;
    switch (activeTab) {
      case 'scoreboard':
        return <ScoreboardTab data={data} />;
      case 'board':
        return <BoardTab data={data} />;
      case 'compensation':
        return <CompensationTab data={data} />;
      case 'controversies':
        return <ControversiesTab data={data} />;
      case 'provisions':
        return <ProvisionsTab data={data} />;
      case 'trends':
        return <TrendsTab data={data} />;
      default:
        return null;
    }
  }, [activeTab, data]);

  return (
    <GlassCard className="h-full flex flex-col overflow-hidden bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-indigo-500/10 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-[11px] font-mono font-bold text-indigo-400 tracking-widest uppercase">
            {t('panelCorporateGovernance')}
          </span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-0 px-2 py-1 border-b border-border/20 bg-black shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 py-1 text-[8px] font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-500/20 text-indigo-400 font-bold'
                : 'text-neutral/40 hover:text-neutral/60 hover:bg-indigo-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">Loading</span>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-mono text-red-400/60 uppercase tracking-widest">
            Failed to load governance data
          </span>
        </div>
      ) : (
        tabContent
      )}
    </GlassCard>
  );
}
