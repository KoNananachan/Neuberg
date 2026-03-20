import { Loader2 } from 'lucide-react';
import { useTransitionManagement } from '../../api/hooks/use-transition-management';
import { useT, tr, TFn } from '../../i18n';

// -- i18n fallback helper --

// -- Local types --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OverviewData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TradeItem = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectorRebalance = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CostAnalysis = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TrackingErrorData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimelineMilestone = any;

// -- Formatting helpers --

function fmtAmt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(2) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1) + 'bp';
}

function fmtShares(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString();
}

// -- Color helpers --

function sideColor(side: string | null | undefined): string {
  if (!side) return 'text-neutral-500';
  const s = side.toUpperCase();
  if (s === 'BUY') return 'text-green-400';
  if (s === 'SELL') return 'text-red-400';
  return 'text-neutral-500';
}

function statusBadge(status: string | null | undefined): string {
  if (!status) return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'DONE' || s === 'FILLED') return 'bg-green-400/20 text-green-400 border-green-400/30';
  if (s === 'IN PROGRESS' || s === 'WORKING' || s === 'PARTIAL') return 'bg-teal-400/20 text-teal-400 border-teal-400/30';
  if (s === 'PENDING' || s === 'QUEUED') return 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30';
  if (s === 'CANCELLED' || s === 'FAILED' || s === 'REJECTED') return 'bg-red-400/20 text-red-400 border-red-400/30';
  return 'bg-neutral-400/20 text-neutral-400 border-neutral-400/30';
}

function milestoneStatusColor(status: string | null | undefined): string {
  if (!status) return 'bg-neutral-600';
  const s = status.toUpperCase();
  if (s === 'COMPLETED' || s === 'DONE') return 'bg-green-400';
  if (s === 'IN PROGRESS' || s === 'ACTIVE' || s === 'CURRENT') return 'bg-teal-400';
  if (s === 'PENDING' || s === 'UPCOMING') return 'bg-neutral-600';
  if (s === 'DELAYED' || s === 'AT RISK') return 'bg-yellow-400';
  if (s === 'FAILED' || s === 'BLOCKED') return 'bg-red-400';
  return 'bg-neutral-600';
}

function deltaColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// -- Cost bar colors --

const COST_COLORS: Record<string, string> = {
  marketImpact: '#2dd4bf',
  commission: '#0d9488',
  spread: '#115e59',
  opportunityCost: '#5eead4',
};

// -- Main Panel --

export function TransitionManagementPanel() {
  const t = useT();
  const { data, isLoading, error } = useTransitionManagement();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load transition management data
        </div>
      </div>
    );
  }

  const overview: OverviewData = data?.overview;
  const trades: TradeItem[] = data?.trades ?? [];
  const sectorRebalancing: SectorRebalance[] = data?.sectorRebalancing ?? [];
  const costAnalysis: CostAnalysis = data?.costAnalysis;
  const trackingError: TrackingErrorData = data?.trackingError;
  const timeline: TimelineMilestone[] = data?.timeline ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-teal-400">
            {tr(t, 'panelTransitionManagement', 'Transition Management')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">TM</span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-teal-400" />}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Overview */}
        {overview && <OverviewSection overview={overview} />}

        {/* Trade List */}
        {trades.length > 0 && <TradeListSection trades={trades} />}

        {/* Sector Rebalancing */}
        {sectorRebalancing.length > 0 && <SectorRebalancingSection sectors={sectorRebalancing} />}

        {/* Cost Analysis */}
        {costAnalysis && <CostAnalysisSection cost={costAnalysis} />}

        {/* Tracking Error */}
        {trackingError && <TrackingErrorSection te={trackingError} />}

        {/* Timeline */}
        {timeline.length > 0 && <TimelineSection milestones={timeline} />}

      </div>
    </div>
  );
}

// -- 1. Overview Section --

function OverviewSection({ overview }: { overview: OverviewData }) {
  const cards = [
    {
      label: 'Legacy AUM',
      value: fmtAmt(overview?.legacyAum),
      color: 'text-white/80',
    },
    {
      label: 'Target AUM',
      value: fmtAmt(overview?.targetAum),
      color: 'text-white/80',
    },
    {
      label: 'Overlap',
      value: fmtPct(overview?.overlapPct),
      color: 'text-teal-400',
    },
    {
      label: 'Turnover',
      value: fmtPct(overview?.turnoverPct),
      color: 'text-teal-400',
    },
    {
      label: 'Est Cost',
      value: overview?.estCost != null ? fmtBps(overview.estCost) : '-',
      color: 'text-yellow-400',
    },
    {
      label: 'Completion',
      value: fmtPct(overview?.completionPct),
      color: overview?.completionPct != null && overview.completionPct >= 90
        ? 'text-green-400 font-black'
        : 'text-teal-400 font-black',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-0 border-b border-border/20 shrink-0">
      {cards.map((c) => (
        <div
          key={c.label}
          className="px-2 py-2 border-r border-border/20 last:border-r-0"
        >
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            {c.label}
          </div>
          <div className={`text-[11px] font-mono font-black tabular-nums mt-0.5 ${c.color}`}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// -- 2. Trade List Section --

function TradeListSection({ trades }: { trades: TradeItem[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-teal-400 uppercase tracking-wider">
          Trade List
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
            <tr>
              <th className="px-2 py-1.5 text-left font-bold">Ticker</th>
              <th className="px-2 py-1.5 text-left font-bold">Side</th>
              <th className="px-2 py-1.5 text-right font-bold">Shares</th>
              <th className="px-2 py-1.5 text-left font-bold">Strategy</th>
              <th className="px-2 py-1.5 text-right font-bold">Impact</th>
              <th className="px-2 py-1.5 text-left font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade: TradeItem, i: number) => (
              <tr
                key={trade?.ticker ?? i}
                className="border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-left text-teal-400 font-bold">
                  {trade?.ticker ?? '-'}
                </td>
                <td className={`px-2 py-1 text-left font-bold ${sideColor(trade?.side)}`}>
                  {trade?.side?.toUpperCase() ?? '-'}
                </td>
                <td className="px-2 py-1 text-right text-white/80 tabular-nums">
                  {fmtShares(trade?.shares)}
                </td>
                <td className="px-2 py-1 text-left text-white/70">
                  {trade?.strategy ?? '-'}
                </td>
                <td className="px-2 py-1 text-right text-white/80 tabular-nums">
                  {fmtBps(trade?.impact)}
                </td>
                <td className="px-2 py-1 text-left">
                  <span
                    className={`inline-block px-1 py-px text-[7px] font-mono font-bold uppercase border ${statusBadge(trade?.status)}`}
                  >
                    {trade?.status ?? '-'}
                  </span>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                  No trades
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- 3. Sector Rebalancing Section --

function SectorRebalancingSection({ sectors }: { sectors: SectorRebalance[] }) {
  const maxWeight = sectors.reduce((mx: number, s: SectorRebalance) => {
    const from = Math.abs(s?.fromWeight ?? 0);
    const to = Math.abs(s?.toWeight ?? 0);
    return Math.max(mx, from, to);
  }, 0) || 1;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-teal-400 uppercase tracking-wider">
          Sector Rebalancing
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1">
        <div className="flex items-center gap-1">
          <div className="w-[8px] h-[4px] bg-neutral-600" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Legacy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-[8px] h-[4px] bg-teal-400" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Target</span>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-1.5">
        {sectors.map((sector: SectorRebalance, i: number) => {
          const fromW = sector?.fromWeight ?? 0;
          const toW = sector?.toWeight ?? 0;
          const delta = toW - fromW;
          const fromBarWidth = (Math.abs(fromW) / maxWeight) * 100;
          const toBarWidth = (Math.abs(toW) / maxWeight) * 100;

          return (
            <div key={sector?.sector ?? i} className="hover:bg-teal-400/[0.02] transition-colors px-1 py-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono font-bold text-white/80 uppercase">
                  {sector?.sector ?? '-'}
                </span>
                <span className={`text-[7px] font-mono font-bold tabular-nums ${deltaColor(delta)}`}>
                  {delta > 0 ? '+' : ''}{fmtPct(delta)}
                </span>
              </div>
              {/* From (legacy) bar */}
              <div className="flex items-center gap-1 mb-[2px]">
                <div className="h-[4px] bg-neutral-800 flex-1 relative">
                  <div
                    className="h-full bg-neutral-600 transition-all"
                    style={{ width: `${fromBarWidth}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-neutral-500 tabular-nums w-[36px] text-right shrink-0">
                  {fmtPct(fromW)}
                </span>
              </div>
              {/* To (target) bar */}
              <div className="flex items-center gap-1">
                <div className="h-[4px] bg-neutral-800 flex-1 relative">
                  <div
                    className="h-full bg-teal-400 transition-all"
                    style={{ width: `${toBarWidth}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-teal-400 tabular-nums w-[36px] text-right shrink-0">
                  {fmtPct(toW)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- 4. Cost Analysis Section --

function CostAnalysisSection({ cost }: { cost: CostAnalysis }) {
  const components = [
    { key: 'marketImpact', label: 'Market Impact', value: cost?.marketImpact },
    { key: 'commission', label: 'Commission', value: cost?.commission },
    { key: 'spread', label: 'Spread', value: cost?.spread },
    { key: 'opportunityCost', label: 'Opportunity Cost', value: cost?.opportunityCost },
  ];

  const total = components.reduce((sum, c) => sum + (c.value ?? 0), 0);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
        <span className="text-[8px] font-mono font-black text-teal-400 uppercase tracking-wider">
          Cost Analysis
        </span>
        <span className="text-[8px] font-mono font-bold text-white/80 tabular-nums">
          Total: {fmtBps(total)}
        </span>
      </div>

      {/* Stacked bar */}
      <div className="px-3 py-2">
        <div className="h-[8px] w-full flex">
          {components.map((c) => {
            const width = total > 0 ? ((c.value ?? 0) / total) * 100 : 0;
            return (
              <div
                key={c.key}
                className="h-full transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: COST_COLORS[c.key] ?? '#71717a',
                }}
                title={`${c.label}: ${fmtBps(c.value)}`}
              />
            );
          })}
        </div>

        {/* Legend + values */}
        <div className="grid grid-cols-4 gap-0 mt-2">
          {components.map((c) => (
            <div key={c.key} className="px-1">
              <div className="flex items-center gap-1 mb-0.5">
                <div
                  className="w-[6px] h-[6px] shrink-0"
                  style={{ backgroundColor: COST_COLORS[c.key] ?? '#71717a' }}
                />
                <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
                  {c.label}
                </span>
              </div>
              <div className="text-[9px] font-mono font-bold text-white/80 tabular-nums pl-[10px]">
                {fmtBps(c.value)}
              </div>
              {total > 0 && c.value != null && (
                <div className="text-[7px] font-mono text-neutral-600 tabular-nums pl-[10px]">
                  {((c.value / total) * 100).toFixed(0)}%
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- 5. Tracking Error Section --

function TrackingErrorSection({ te }: { te: TrackingErrorData }) {
  const phases = [
    { label: 'Pre-Transition', value: te?.preTransition, key: 'pre' },
    { label: 'During Transition', value: te?.duringTransition, key: 'during' },
    { label: 'Post-Transition', value: te?.postTransition, key: 'post' },
  ];

  const maxTE = phases.reduce((mx, p) => Math.max(mx, Math.abs(p.value ?? 0)), 0) || 1;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
        <span className="text-[8px] font-mono font-black text-teal-400 uppercase tracking-wider">
          Tracking Error
        </span>
        {te?.target != null && (
          <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
            Target: <span className="text-teal-400 font-bold">{fmtBps(te.target)}</span>
          </span>
        )}
      </div>

      <div className="px-3 py-2 space-y-2">
        {phases.map((phase) => {
          const val = phase.value ?? 0;
          const barWidth = (Math.abs(val) / maxTE) * 100;
          const isActive = phase.key === 'during';
          const isPast = phase.key === 'pre';

          return (
            <div key={phase.key} className="hover:bg-teal-400/[0.02] transition-colors px-1 py-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[8px] font-mono font-bold uppercase tracking-wider ${
                  isActive ? 'text-teal-400' : isPast ? 'text-neutral-500' : 'text-white/80'
                }`}>
                  {phase.label}
                </span>
                <span className={`text-[9px] font-mono font-bold tabular-nums ${
                  isActive ? 'text-teal-400' : 'text-white/80'
                }`}>
                  {fmtBps(phase.value)}
                </span>
              </div>
              <div className="h-[4px] bg-neutral-800 w-full relative">
                <div
                  className={`h-full transition-all ${
                    isActive ? 'bg-teal-400' : isPast ? 'bg-neutral-600' : 'bg-green-400'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
                {/* Target marker */}
                {te?.target != null && maxTE > 0 && (
                  <div
                    className="absolute top-[-2px] w-[1px] h-[8px] bg-yellow-400"
                    style={{ left: `${(te.target / maxTE) * 100}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- 6. Timeline Section --

function TimelineSection({ milestones }: { milestones: TimelineMilestone[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-teal-400 uppercase tracking-wider">
          Transition Timeline
        </span>
      </div>

      <div className="px-3 py-2">
        {milestones.map((ms: TimelineMilestone, i: number) => {
          const isLast = i === milestones.length - 1;
          const statusDot = milestoneStatusColor(ms?.status);

          return (
            <div key={ms?.label ?? i} className="flex gap-2 hover:bg-teal-400/[0.02] transition-colors">
              {/* Timeline connector */}
              <div className="flex flex-col items-center shrink-0 w-3">
                <div className={`w-[7px] h-[7px] ${statusDot} shrink-0 mt-0.5`} />
                {!isLast && (
                  <div className="w-[1px] flex-1 bg-neutral-800 min-h-[16px]" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-2 ${isLast ? '' : 'border-b border-border/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-mono font-bold text-white/80 uppercase tracking-wider">
                    {ms?.label ?? '-'}
                  </span>
                  <span className="text-[7px] font-mono text-neutral-500 tabular-nums">
                    {ms?.date ?? '-'}
                  </span>
                </div>
                {ms?.description && (
                  <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
                    {ms.description}
                  </div>
                )}
                {ms?.status && (
                  <span
                    className={`inline-block mt-0.5 px-1 py-px text-[6px] font-mono font-bold uppercase border ${statusBadge(ms.status)}`}
                  >
                    {ms.status}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
