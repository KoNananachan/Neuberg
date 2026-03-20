import { useMemo } from 'react';
import { useOperationalRisk } from '../../api/hooks/use-operational-risk';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Local types (no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OperationalRiskData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LossEvent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LossCategory = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KRIEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScenarioEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CapitalAllocation = any;

// ── Constants ──

const ACCENT = '#f87171'; // red-400

const SEVERITY_COLORS: Record<string, { text: string; fill: string; bg: string }> = {
  critical: { text: 'text-red-400', fill: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  high: { text: 'text-orange-400', fill: '#fb923c', bg: 'rgba(251,146,60,0.10)' },
  medium: { text: 'text-amber-400', fill: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  low: { text: 'text-emerald-400', fill: '#34d399', bg: 'rgba(52,211,153,0.06)' },
};

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  fraud: { label: 'FRD', color: 'text-red-400 bg-red-400/10' },
  technology: { label: 'TEC', color: 'text-blue-400 bg-blue-400/10' },
  execution: { label: 'EXE', color: 'text-amber-400 bg-amber-400/10' },
  compliance: { label: 'CMP', color: 'text-purple-400 bg-purple-400/10' },
  legal: { label: 'LGL', color: 'text-cyan-400 bg-cyan-400/10' },
  external: { label: 'EXT', color: 'text-orange-400 bg-orange-400/10' },
  people: { label: 'PPL', color: 'text-pink-400 bg-pink-400/10' },
};

const KRI_STATUS_COLORS: Record<string, string> = {
  green: '#34d399',
  amber: '#fbbf24',
  red: '#f87171',
};

// ── Formatting helpers ──

function fmtAmount(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function fmtDate(d: string): string {
  try {
    const date = new Date(d);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${mm}/${dd}`;
  } catch {
    return d;
  }
}

function getSeverityStyle(severity: string) {
  return SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
}

function getCategoryBadge(category: string) {
  return CATEGORY_BADGES[category] || { label: category?.slice(0, 3)?.toUpperCase() || '???', color: 'text-neutral-400 bg-neutral-400/10' };
}

// ── Main Panel ──

export function OperationalRiskPanel() {
  const t = useT();
  const { data, isLoading, error } = useOperationalRisk();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" stroke={ACCENT} strokeWidth="1.2" fill="none" opacity="0.6" />
            <line x1="2" y1="8" x2="14" y2="8" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
            <line x1="8" y1="2" x2="8" y2="14" stroke={ACCENT} strokeWidth="0.5" opacity="0.3" />
            <path d="M5 10L8 5L11 10H5Z" fill={ACCENT} opacity="0.5" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-red-400">
            {t('panelOperationalRisk')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.riskLevel && (
            <span
              className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5"
              style={{
                color: getSeverityStyle(data.riskLevel).fill,
                background: getSeverityStyle(data.riskLevel).bg,
              }}
            >
              {data.riskLevel}
            </span>
          )}
          <RefreshCw className={`w-3 h-3 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400/60 text-[9px] font-mono uppercase">
            {tr(t, 'opriskError', 'Failed to load operational risk data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'opriskNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryCards data={data} t={t} />
            <LossEventsFeed events={data.lossEvents} t={t} />
            <LossDistribution categories={data.lossDistribution} t={t} />
            <KRIDashboard indicators={data.kris} t={t} />
            <ScenarioAnalysis scenarios={data.scenarios} t={t} />
            <CapitalAllocationSection allocations={data.capitalAllocations} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Summary Cards ──

function SummaryCards({ data, t }: { data: OperationalRiskData; t: ReturnType<typeof useT> }) {
  const cards = [
    {
      label: tr(t, 'opriskTotalLossesYTD', 'Total Losses YTD'),
      value: fmtAmount(data.totalLossesYTD ?? 0),
      change: data.totalLossesYTDChange,
    },
    {
      label: tr(t, 'opriskEventCount', 'Event Count'),
      value: String(data.eventCount ?? 0),
      change: data.eventCountChange,
    },
    {
      label: tr(t, 'opriskOpVaR', 'OpVaR (99.9%)'),
      value: fmtAmount(data.opVaR ?? 0),
      change: data.opVaRChange,
    },
    {
      label: tr(t, 'opriskCapitalCharge', 'Capital Charge'),
      value: fmtAmount(data.capitalCharge ?? 0),
      change: data.capitalChargeChange,
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {cards.map((card) => (
          <div key={card.label} className="bg-black px-2 py-2">
            <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-600 mb-1">
              {card.label}
            </div>
            <div className="text-[11px] font-mono font-black text-white leading-none">
              {card.value}
            </div>
            {card.change != null && (
              <div
                className={`text-[7px] font-mono font-bold mt-0.5 ${
                  card.change > 0 ? 'text-red-400' : card.change < 0 ? 'text-emerald-400' : 'text-neutral-500'
                }`}
              >
                {card.change > 0 ? '+' : ''}{fmtPct(card.change)} MoM
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Loss Events Feed ──

function LossEventsFeed({ events, t }: { events?: LossEvent[]; t: ReturnType<typeof useT> }) {
  if (!events?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'opriskLossEvents', 'Loss Events Feed')}
        </span>
      </div>
      <div className="max-h-[180px] overflow-auto no-scrollbar">
        {events.map((event: LossEvent, i: number) => {
          const severity = getSeverityStyle(event.severity);
          const badge = getCategoryBadge(event.category);

          return (
            <div
              key={event.id ?? i}
              className="flex items-center gap-2 px-3 py-1.5 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors"
            >
              {/* Severity indicator */}
              <div
                className="w-1.5 h-1.5 shrink-0"
                style={{
                  backgroundColor: severity.fill,
                  boxShadow: event.severity === 'critical' ? `0 0 4px ${severity.fill}` : 'none',
                }}
              />

              {/* Date */}
              <span className="text-[7px] font-mono text-neutral-600 w-10 shrink-0">
                {fmtDate(event.date)}
              </span>

              {/* Category badge */}
              <span className={`text-[6px] font-mono font-bold px-1 py-0.5 shrink-0 ${badge.color}`}>
                {badge.label}
              </span>

              {/* Description */}
              <span className="text-[7px] font-mono text-neutral-300 truncate flex-1 min-w-0">
                {event.description}
              </span>

              {/* Amount */}
              <span className="text-[8px] font-mono font-bold text-white shrink-0">
                {fmtAmount(event.amount ?? 0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 3. Loss Distribution ──

function LossDistribution({ categories, t }: { categories?: LossCategory[]; t: ReturnType<typeof useT> }) {
  const sorted = useMemo(
    () => (categories ? [...categories].sort((a: LossCategory, b: LossCategory) => (b.amount ?? 0) - (a.amount ?? 0)) : []),
    [categories],
  );

  if (!sorted.length) return null;

  const maxAmount = sorted[0]?.amount ?? 1;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'opriskLossDistribution', 'Loss Distribution by Category')}
        </span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        {sorted.map((cat: LossCategory, i: number) => {
          const pct = maxAmount > 0 ? ((cat.amount ?? 0) / maxAmount) * 100 : 0;
          const badge = getCategoryBadge(cat.category);
          const barColor = CATEGORY_BADGES[cat.category]?.color.includes('red')
            ? ACCENT
            : CATEGORY_BADGES[cat.category]?.color.includes('blue')
              ? '#60a5fa'
              : CATEGORY_BADGES[cat.category]?.color.includes('amber')
                ? '#fbbf24'
                : CATEGORY_BADGES[cat.category]?.color.includes('purple')
                  ? '#a78bfa'
                  : CATEGORY_BADGES[cat.category]?.color.includes('cyan')
                    ? '#22d3ee'
                    : CATEGORY_BADGES[cat.category]?.color.includes('orange')
                      ? '#fb923c'
                      : CATEGORY_BADGES[cat.category]?.color.includes('pink')
                        ? '#f472b6'
                        : '#71717a';

          return (
            <div key={cat.category ?? i}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[6px] font-mono font-bold px-1 py-0.5 ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="text-[7px] font-mono text-neutral-400 capitalize">
                    {cat.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[7px] font-mono text-neutral-500">
                    {cat.count ?? 0} events
                  </span>
                  <span className="text-[8px] font-mono font-bold text-white">
                    {fmtAmount(cat.amount ?? 0)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-neutral-900 relative">
                <div
                  className="absolute top-0 left-0 h-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: barColor,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. KRI Dashboard ──

function KRIDashboard({ indicators, t }: { indicators?: KRIEntry[]; t: ReturnType<typeof useT> }) {
  if (!indicators?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'opriskKRIDashboard', 'Key Risk Indicators')}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-px bg-border/10">
        {indicators.map((kri: KRIEntry, i: number) => (
          <KRICard key={kri.name ?? i} kri={kri} />
        ))}
      </div>
    </div>
  );
}

function KRICard({ kri }: { kri: KRIEntry }) {
  const statusColor = KRI_STATUS_COLORS[kri.status] ?? KRI_STATUS_COLORS.green;
  const sparkline = kri.sparkline as number[] | undefined;

  return (
    <div className="bg-black px-2 py-1.5 hover:bg-red-400/[0.02] transition-colors">
      {/* Name + status dot */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono font-bold text-neutral-300 truncate">
          {kri.name}
        </span>
        <div
          className="w-2 h-2 shrink-0"
          style={{
            backgroundColor: statusColor,
            borderRadius: '50%',
            boxShadow: kri.status === 'red' ? `0 0 4px ${statusColor}` : 'none',
          }}
        />
      </div>

      {/* Current value */}
      <div className="flex items-baseline gap-1 mb-1">
        <span className="text-[10px] font-mono font-black text-white">
          {typeof kri.value === 'number' ? kri.value.toFixed(1) : kri.value}
        </span>
        {kri.unit && (
          <span className="text-[6px] font-mono text-neutral-600">{kri.unit}</span>
        )}
      </div>

      {/* Threshold bar */}
      {kri.threshold != null && kri.value != null && (
        <div className="mb-1">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[6px] font-mono text-neutral-600">THRESHOLD</span>
            <span className="text-[6px] font-mono text-neutral-500">{kri.threshold}</span>
          </div>
          <div className="h-1 bg-neutral-900 relative">
            <div
              className="absolute top-0 left-0 h-full"
              style={{
                width: `${Math.min(100, ((kri.value / kri.threshold) * 100))}%`,
                backgroundColor: statusColor,
                opacity: 0.6,
              }}
            />
            {/* Threshold marker */}
            <div
              className="absolute top-0 h-full w-px"
              style={{ left: '100%', backgroundColor: 'rgba(255,255,255,0.3)' }}
            />
          </div>
        </div>
      )}

      {/* Sparkline */}
      {sparkline && sparkline.length > 1 && (
        <KRISparkline values={sparkline} status={kri.status} />
      )}
    </div>
  );
}

function KRISparkline({ values, status }: { values: number[]; status: string }) {
  const W = 50;
  const H = 12;
  const PAD = 1;

  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const rangeV = maxV - minV || 1;

  const points = values.map((v, i) => ({
    x: PAD + (i / (values.length - 1)) * (W - PAD * 2),
    y: PAD + ((maxV - v) / rangeV) * (H - PAD * 2),
  }));

  const pathD = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  const strokeColor = KRI_STATUS_COLORS[status] ?? KRI_STATUS_COLORS.green;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 12 }}>
      <path d={pathD} fill="none" stroke={strokeColor} strokeWidth={0.8} opacity={0.7} />
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={1.2}
        fill={strokeColor}
      />
    </svg>
  );
}

// ── 5. Scenario Analysis ──

function ScenarioAnalysis({ scenarios, t }: { scenarios?: ScenarioEntry[]; t: ReturnType<typeof useT> }) {
  if (!scenarios?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'opriskScenarioAnalysis', 'Scenario Analysis')}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {scenarios.map((scenario: ScenarioEntry, i: number) => (
          <ScenarioCard key={scenario.name ?? i} scenario={scenario} />
        ))}
      </div>
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: ScenarioEntry }) {
  const severity = getSeverityStyle(scenario.severity ?? 'medium');
  const probability = scenario.probability ?? 0;

  // Probability bar color
  const probColor = probability >= 50 ? '#f87171' : probability >= 25 ? '#fbbf24' : '#34d399';

  return (
    <div className="bg-black px-2 py-2 hover:bg-red-400/[0.02] transition-colors">
      {/* Name + severity */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono font-bold text-neutral-300 truncate flex-1 min-w-0">
          {scenario.name}
        </span>
        <span
          className="text-[6px] font-mono font-bold uppercase px-1 py-0.5 shrink-0 ml-1"
          style={{ color: severity.fill, background: severity.bg }}
        >
          {scenario.severity ?? 'N/A'}
        </span>
      </div>

      {/* Description */}
      {scenario.description && (
        <div className="text-[6px] font-mono text-neutral-600 mb-1.5 leading-tight line-clamp-2">
          {scenario.description}
        </div>
      )}

      {/* Estimated loss */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Est. Loss</span>
        <span className="text-[9px] font-mono font-bold text-white">
          {fmtAmount(scenario.estimatedLoss ?? 0)}
        </span>
      </div>

      {/* Probability bar */}
      <div>
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">Probability</span>
          <span className="text-[7px] font-mono font-bold" style={{ color: probColor }}>
            {fmtPct(probability)}
          </span>
        </div>
        <div className="h-1 bg-neutral-900 relative">
          <div
            className="absolute top-0 left-0 h-full"
            style={{
              width: `${Math.min(100, probability)}%`,
              backgroundColor: probColor,
              opacity: 0.6,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ── 6. Capital Allocation ──

function CapitalAllocationSection({
  allocations,
  t,
}: {
  allocations?: CapitalAllocation[];
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => (allocations ? [...allocations].sort((a: CapitalAllocation, b: CapitalAllocation) => (b.utilization ?? 0) - (a.utilization ?? 0)) : []),
    [allocations],
  );

  if (!sorted.length) return null;

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500 mb-2">
        {tr(t, 'opriskCapitalAllocation', 'Capital Allocation by Business Line')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_60px_50px_80px] gap-1 mb-1">
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase">Business Line</span>
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right">Allocated</span>
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right">Util %</span>
        <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase"></span>
      </div>

      {sorted.map((alloc: CapitalAllocation, i: number) => {
        const utilization = alloc.utilization ?? 0;
        const barColor = utilization >= 90 ? '#f87171' : utilization >= 70 ? '#fbbf24' : '#34d399';

        return (
          <div
            key={alloc.businessLine ?? i}
            className="grid grid-cols-[1fr_60px_50px_80px] gap-1 py-1 border-t border-border/10 items-center hover:bg-red-400/[0.02] transition-colors"
          >
            <span className="text-[7px] font-mono text-neutral-300 truncate">
              {alloc.businessLine}
            </span>
            <span className="text-[7px] font-mono text-white text-right">
              {fmtAmount(alloc.allocated ?? 0)}
            </span>
            <span
              className="text-[7px] font-mono font-bold text-right"
              style={{ color: barColor }}
            >
              {fmtPct(utilization)}
            </span>
            <div className="h-1.5 bg-neutral-900 relative">
              <div
                className="absolute top-0 left-0 h-full transition-all"
                style={{
                  width: `${Math.min(100, utilization)}%`,
                  backgroundColor: barColor,
                  opacity: 0.7,
                }}
              />
              {/* 100% threshold marker */}
              {utilization > 85 && (
                <div
                  className="absolute top-0 h-full w-px"
                  style={{ left: '100%', backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Timestamp */}
      {sorted.length > 0 && (
        <div className="mt-2 pt-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'opriskLastUpdate', 'Last update')}: {new Date().toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
