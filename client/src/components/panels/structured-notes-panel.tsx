import { useState, useMemo } from 'react';
import { useStructuredNotes } from '../../api/hooks/use-structured-notes';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
// ── Types ──

interface ActiveNote {
  id: string;
  issuer: string;
  type: string;
  underlying: string;
  coupon: number;
  barrier: number;
  currentLevel: number;
  distanceToBarrier: number;
  status: 'active' | 'breached' | 'autocalled' | 'matured' | 'near_barrier';
  maturity: string;
  notional: number;
}

interface BarrierAlert {
  noteId: string;
  issuer: string;
  underlying: string;
  distancePct: number;
  breachProbability: number;
  timeDecay: number;
  daysToMaturity: number;
  trend: 'approaching' | 'receding' | 'stable';
}

interface IssuancePipeline {
  id: string;
  issuer: string;
  type: string;
  underlying: string;
  indicativeCoupon: number;
  barrier: number;
  tenor: string;
  launchDate: string;
  status: 'pricing' | 'bookbuilding' | 'launched';
}

interface PerformanceSummary {
  ytdReturn: number;
  autocallRate: number;
  breachRate: number;
  avgCoupon: number;
  totalNotional: number;
  activeCount: number;
  maturedCount: number;
  avgDistanceToBarrier: number;
}

interface StructuredNotesData {
  activeNotes: ActiveNote[];
  barrierAlerts: BarrierAlert[];
  issuancePipeline: IssuancePipeline[];
  performance: PerformanceSummary;
  timestamp: string;
}

// ── Tabs ──

const TABS = ['active', 'barriers', 'pipeline', 'performance'] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  active: 'Active Notes',
  barriers: 'Barrier Monitor',
  pipeline: 'Issuance Pipeline',
  performance: 'Performance',
};

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtCompact(n: number): string {
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(0) + 'K';
  return n.toFixed(0);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

// ── Color helpers ──

function statusStyle(status: ActiveNote['status']): { text: string; bg: string } {
  switch (status) {
    case 'active':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' };
    case 'breached':
      return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
    case 'autocalled':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
    case 'matured':
      return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
    case 'near_barrier':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30' };
  }
}

function statusLabel(status: ActiveNote['status']): string {
  switch (status) {
    case 'active': return 'ACTIVE';
    case 'breached': return 'BREACH';
    case 'autocalled': return 'AUTOCALL';
    case 'matured': return 'MATURED';
    case 'near_barrier': return 'NEAR BRR';
  }
}

function trendArrow(trend: BarrierAlert['trend']): { arrow: string; color: string } {
  switch (trend) {
    case 'approaching': return { arrow: '\u2193', color: 'text-red-400' };
    case 'receding': return { arrow: '\u2191', color: 'text-emerald-400' };
    case 'stable': return { arrow: '\u2192', color: 'text-neutral-500' };
  }
}

function pipelineStatusStyle(status: IssuancePipeline['status']): { text: string; bg: string } {
  switch (status) {
    case 'pricing':
      return { text: 'text-amber-400', bg: 'bg-amber-500/10 border border-amber-500/30' };
    case 'bookbuilding':
      return { text: 'text-blue-400', bg: 'bg-blue-500/10 border border-blue-500/30' };
    case 'launched':
      return { text: 'text-emerald-400', bg: 'bg-emerald-500/10 border border-emerald-500/30' };
  }
}

function probColor(prob: number): string {
  if (prob >= 50) return 'text-red-400';
  if (prob >= 25) return 'text-amber-400';
  return 'text-emerald-400';
}

// ── Main Panel ──

export function StructuredNotesPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useStructuredNotes();
  const [activeTab, setActiveTab] = useState<Tab>('active');

  const data = rawData as StructuredNotesData | undefined;

  const activeCount = data?.activeNotes?.filter((n) => n.status === 'active' || n.status === 'near_barrier').length ?? 0;
  const alertCount = data?.barrierAlerts?.length ?? 0;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-purple-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-purple-400">
            {tr(t, 'snTitle', 'Structured Notes Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span className="text-[7px] font-mono text-neutral-500">
              {activeCount} {tr(t, 'snActive', 'active')}
              {alertCount > 0 && (
                <span className="text-amber-400 ml-1.5">{alertCount} {tr(t, 'snAlerts', 'alerts')}</span>
              )}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-purple-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'text-purple-400 bg-purple-400/10 border-b border-purple-400'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-purple-400/30 border-t-purple-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'snNoData', 'No data available')}
          </div>
        )}

        {data && activeTab === 'active' && <ActiveNotesSection notes={data.activeNotes} t={t} />}
        {data && activeTab === 'barriers' && <BarrierMonitorSection alerts={data.barrierAlerts} t={t} />}
        {data && activeTab === 'pipeline' && <IssuancePipelineSection pipeline={data.issuancePipeline} t={t} />}
        {data && activeTab === 'performance' && <PerformanceSection performance={data.performance} t={t} />}
      </div>

      {/* Footer timestamp */}
      {data?.timestamp && (
        <div className="shrink-0 px-3 py-0.5 border-t border-border/10 bg-[#050505]">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'snLastUpdate', 'Last update')}: {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Section 1: Active Notes ──

function ActiveNotesSection({
  notes,
  t,
}: {
  notes: ActiveNote[];
  t: ReturnType<typeof useT>;
}) {
  const [sortBy, setSortBy] = useState<'distance' | 'coupon' | 'notional'>('distance');

  const sorted = useMemo(() => {
    if (!notes?.length) return [];
    return [...notes].sort((a, b) => {
      switch (sortBy) {
        case 'distance': return a.distanceToBarrier - b.distanceToBarrier;
        case 'coupon': return b.coupon - a.coupon;
        case 'notional': return b.notional - a.notional;
        default: return 0;
      }
    });
  }, [notes, sortBy]);

  if (!sorted.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'snNoActiveNotes', 'No active notes')}
      </div>
    );
  }

  return (
    <>
      {/* Sort controls */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-border/10 bg-black/20 shrink-0">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">Sort:</span>
        {(['distance', 'coupon', 'notional'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase transition-all ${
              sortBy === s
                ? 'text-purple-400 bg-purple-400/10'
                : 'text-neutral-600 hover:text-neutral-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[60px_55px_50px_40px_45px_50px_45px_50px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>Issuer</span>
        <span>Type</span>
        <span>Undl</span>
        <span className="text-right">Cpn</span>
        <span className="text-right">Barrier</span>
        <span className="text-right">Level</span>
        <span className="text-right">Dist</span>
        <span className="text-center">Status</span>
      </div>

      {/* Rows */}
      {sorted.map((note) => {
        const style = statusStyle(note.status);
        const isNearBarrier = note.distanceToBarrier < 10;

        return (
          <div
            key={note.id}
            className={`grid grid-cols-[60px_55px_50px_40px_45px_50px_45px_50px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center ${
              isNearBarrier ? 'border-l-2 border-l-amber-500/50' : ''
            }`}
          >
            <span className="text-neutral-300 truncate font-bold">{note.issuer}</span>
            <span className="text-neutral-500 truncate">{note.type}</span>
            <span className="text-purple-400 font-bold">{note.underlying}</span>
            <span className="text-right text-emerald-400">{note.coupon.toFixed(1)}%</span>
            <span className="text-right text-neutral-400">{note.barrier}%</span>
            <span className="text-right text-neutral-300">{note.currentLevel.toFixed(1)}</span>
            <span className={`text-right font-bold ${note.distanceToBarrier < 5 ? 'text-red-400' : note.distanceToBarrier < 15 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {note.distanceToBarrier.toFixed(1)}%
            </span>
            <span className="text-center">
              <span className={`text-[7px] font-black px-1 py-px ${style.text} ${style.bg}`}>
                {statusLabel(note.status)}
              </span>
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Section 2: Barrier Monitoring ──

function BarrierMonitorSection({
  alerts,
  t,
}: {
  alerts: BarrierAlert[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(() => {
    if (!alerts?.length) return [];
    return [...alerts].sort((a, b) => a.distancePct - b.distancePct);
  }, [alerts]);

  if (!sorted.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'snNoBarrierAlerts', 'No barrier alerts')}
      </div>
    );
  }

  return (
    <>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10 bg-black/20 shrink-0">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400/70">
          {tr(t, 'snBarrierWarning', 'Notes Near Barrier')} ({sorted.length})
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[60px_50px_45px_55px_45px_40px_1fr] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>Issuer</span>
        <span>Undl</span>
        <span className="text-right">Dist %</span>
        <span className="text-right">Brch Prob</span>
        <span className="text-right">Decay</span>
        <span className="text-right">Days</span>
        <span className="text-center">Trend</span>
      </div>

      {/* Rows */}
      {sorted.map((alert) => {
        const trend = trendArrow(alert.trend);
        const isCritical = alert.distancePct < 5;

        return (
          <div
            key={alert.noteId}
            className={`grid grid-cols-[60px_50px_45px_55px_45px_40px_1fr] text-[9px] font-mono px-3 py-1.5 border-b hover:bg-purple-400/[0.02] transition-colors items-center ${
              isCritical ? 'border-red-500/30 bg-red-500/[0.03] border-l-2 border-l-red-500' : 'border-border/5'
            }`}
          >
            <span className="text-neutral-300 truncate font-bold">{alert.issuer}</span>
            <span className="text-purple-400 font-bold">{alert.underlying}</span>
            <span className={`text-right font-bold ${alert.distancePct < 5 ? 'text-red-400' : alert.distancePct < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {alert.distancePct.toFixed(1)}%
            </span>
            <span className={`text-right font-bold ${probColor(alert.breachProbability)}`}>
              {alert.breachProbability.toFixed(0)}%
            </span>
            <span className="text-right text-neutral-400">
              {alert.timeDecay.toFixed(2)}
            </span>
            <span className="text-right text-neutral-500">
              {alert.daysToMaturity}d
            </span>
            <span className={`text-center font-bold ${trend.color}`}>
              {trend.arrow} {alert.trend.toUpperCase()}
            </span>
          </div>
        );
      })}

      {/* Breach probability distribution */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          {tr(t, 'snBreachDistribution', 'Breach Probability Distribution')}
        </div>
        <div className="flex gap-1">
          {sorted.map((alert) => {
            const height = Math.max(4, (alert.breachProbability / 100) * 40);
            return (
              <div key={alert.noteId} className="flex flex-col items-center gap-0.5 flex-1">
                <div
                  className="w-full"
                  style={{
                    height: `${height}px`,
                    backgroundColor: alert.breachProbability >= 50
                      ? 'rgba(248,113,113,0.6)'
                      : alert.breachProbability >= 25
                        ? 'rgba(251,191,36,0.5)'
                        : 'rgba(52,211,153,0.4)',
                  }}
                />
                <span className="text-[6px] font-mono text-neutral-600 truncate w-full text-center">
                  {alert.underlying}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

// ── Section 3: Issuance Pipeline ──

function IssuancePipelineSection({
  pipeline,
  t,
}: {
  pipeline: IssuancePipeline[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(() => {
    if (!pipeline?.length) return [];
    return [...pipeline].sort((a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
  }, [pipeline]);

  if (!sorted.length) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr(t, 'snNoPipeline', 'No upcoming issuances')}
      </div>
    );
  }

  return (
    <>
      {/* Section label */}
      <div className="px-3 py-1 border-b border-border/10 bg-black/20 shrink-0">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'snUpcomingIssuances', 'Upcoming Issuances')} ({sorted.length})
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[60px_55px_50px_45px_40px_40px_50px_50px] text-[7px] font-mono text-neutral-500 uppercase tracking-wider px-3 py-1 border-b border-border/10 bg-black/10 shrink-0">
        <span>Issuer</span>
        <span>Type</span>
        <span>Undl</span>
        <span className="text-right">Coupon</span>
        <span className="text-right">Barrier</span>
        <span className="text-right">Tenor</span>
        <span className="text-right">Launch</span>
        <span className="text-center">Status</span>
      </div>

      {/* Rows */}
      {sorted.map((item) => {
        const style = pipelineStatusStyle(item.status);

        return (
          <div
            key={item.id}
            className="grid grid-cols-[60px_55px_50px_45px_40px_40px_50px_50px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-purple-400/[0.02] transition-colors items-center"
          >
            <span className="text-neutral-300 truncate font-bold">{item.issuer}</span>
            <span className="text-neutral-500 truncate">{item.type}</span>
            <span className="text-purple-400 font-bold">{item.underlying}</span>
            <span className="text-right text-emerald-400">{item.indicativeCoupon.toFixed(1)}%</span>
            <span className="text-right text-neutral-400">{item.barrier}%</span>
            <span className="text-right text-neutral-500">{item.tenor}</span>
            <span className="text-right text-neutral-400">{fmtDate(item.launchDate)}</span>
            <span className="text-center">
              <span className={`text-[7px] font-black px-1 py-px ${style.text} ${style.bg}`}>
                {item.status.toUpperCase()}
              </span>
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── Section 4: Performance Summary ──

function PerformanceSection({
  performance,
  t,
}: {
  performance: PerformanceSummary;
  t: ReturnType<typeof useT>;
}) {
  const metrics = [
    {
      label: tr(t, 'snYtdReturn', 'YTD Return'),
      value: fmtPct(performance.ytdReturn),
      color: performance.ytdReturn >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
    {
      label: tr(t, 'snAutocallRate', 'Autocall Rate'),
      value: `${performance.autocallRate.toFixed(1)}%`,
      color: 'text-blue-400',
    },
    {
      label: tr(t, 'snBreachRate', 'Breach Rate'),
      value: `${performance.breachRate.toFixed(1)}%`,
      color: performance.breachRate > 10 ? 'text-red-400' : performance.breachRate > 5 ? 'text-amber-400' : 'text-emerald-400',
    },
    {
      label: tr(t, 'snAvgCoupon', 'Avg Coupon'),
      value: `${performance.avgCoupon.toFixed(2)}%`,
      color: 'text-purple-400',
    },
  ];

  const secondaryMetrics = [
    {
      label: tr(t, 'snTotalNotional', 'Total Notional'),
      value: `$${fmtCompact(performance.totalNotional)}`,
    },
    {
      label: tr(t, 'snActiveCount', 'Active Notes'),
      value: String(performance.activeCount),
    },
    {
      label: tr(t, 'snMaturedCount', 'Matured'),
      value: String(performance.maturedCount),
    },
    {
      label: tr(t, 'snAvgBarrierDist', 'Avg Barrier Dist'),
      value: `${performance.avgDistanceToBarrier.toFixed(1)}%`,
    },
  ];

  return (
    <div className="px-3 py-2">
      {/* Primary metrics */}
      <div className="mb-3">
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'snKeyMetrics', 'Key Metrics')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {metrics.map((m) => (
            <div key={m.label} className="p-2 border border-border/20 bg-[#060606]">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
                {m.label}
              </div>
              <div className={`text-[14px] font-mono font-black ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary metrics */}
      <div className="mb-3">
        <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
          {tr(t, 'snPortfolioStats', 'Portfolio Stats')}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {secondaryMetrics.map((m) => (
            <div key={m.label}>
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.label}
              </div>
              <div className="text-[10px] font-mono font-bold text-neutral-300">
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Visual bars for rates */}
      <div className="border-t border-border/10 pt-2">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1.5">
          {tr(t, 'snRateComparison', 'Rate Comparison')}
        </div>
        <div className="space-y-1.5">
          <RateBar label="Autocall" value={performance.autocallRate} color="rgba(96,165,250,0.7)" />
          <RateBar label="Breach" value={performance.breachRate} color="rgba(248,113,113,0.7)" />
          <RateBar label="Avg Coupon" value={performance.avgCoupon} color="rgba(192,132,252,0.7)" />
        </div>
      </div>
    </div>
  );
}

function RateBar({ label, value, color }: { label: string; value: number; color: string }) {
  const width = Math.min(100, Math.max(2, value));

  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-mono text-neutral-600 w-16 shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-2 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[8px] font-mono text-neutral-400 w-10 text-right shrink-0">
        {value.toFixed(1)}%
      </span>
    </div>
  );
}
