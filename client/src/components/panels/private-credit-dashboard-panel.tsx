import { usePrivateCreditDashboard } from '../../api/hooks/use-private-credit-dashboard';
import { useT, tr, TFn } from '../../i18n';
import {
  Loader2,
  TrendingUp,
  DollarSign,
  Target,
  BarChart3,
  Shield,
  PieChart,
} from 'lucide-react';

// ── Formatting helpers ──

function fmtPct(n: number, d = 2): string {
  return `${n.toFixed(d)}%`;
}

function fmtBp(n: number): string {
  return `${n.toFixed(0)}bp`;
}

function fmtX(n: number): string {
  return `${n.toFixed(2)}x`;
}

function fmtDollarB(n: number): string {
  return `$${n.toFixed(1)}B`;
}

function fmtDollarM(n: number): string {
  return `$${n.toFixed(0)}M`;
}

function fmtDollarAuto(n: number): string {
  if (Math.abs(n) >= 1000) return fmtDollarB(n / 1000);
  return fmtDollarM(n);
}

// ── Color helpers ──

function premiumDiscountColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function perfColor(n: number, hi: number, lo: number): string {
  if (n >= hi) return 'text-green-400';
  if (n >= lo) return 'text-amber-400';
  return 'text-red-400';
}

function defaultRateColor(n: number): string {
  if (n <= 1) return 'text-green-400';
  if (n <= 3) return 'text-yellow-400';
  return 'text-red-400';
}

function statusBadgeClass(status: string): string {
  switch (status?.toLowerCase()) {
    case 'closed':
      return 'bg-green-500/15 text-green-400';
    case 'pricing':
      return 'bg-yellow-500/15 text-yellow-400';
    case 'in market':
    case 'marketing':
      return 'bg-amber-500/15 text-amber-400';
    case 'mandated':
      return 'bg-blue-500/15 text-blue-400';
    default:
      return 'bg-white/10 text-white/50';
  }
}

// ── Section header ──

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/10 bg-[#030303]">
      {Icon && <Icon className="w-3 h-3 text-amber-400/60" />}
      <div className="w-[2px] h-3 bg-amber-400" />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-amber-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function PrivateCreditDashboardPanel() {
  const t = useT();
  const { data, isLoading, refetch } = usePrivateCreditDashboard();
  const d = data as any;

  if (isLoading && !d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        <span className="ml-2 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">
          {tr(t, 'loading', 'LOADING...')}
        </span>
      </div>
    );
  }

  if (!d) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono uppercase tracking-wider">
          FAILED TO LOAD PRIVATE CREDIT DATA
        </span>
      </div>
    );
  }

  const marketOverview = d?.marketOverview ?? d?.overview ?? d?.summary ?? null;
  const dealPipeline = d?.dealPipeline ?? d?.pipeline ?? d?.deals ?? [];
  const defaultRates = d?.defaultRatesByVintage ?? d?.defaultRates ?? d?.vintageDefaults ?? [];
  const sectorAllocation =
    d?.sectorAllocation ?? d?.sectors ?? d?.sectorBreakdown ?? [];
  const returnMetrics = d?.returnMetrics ?? d?.returns ?? d?.performance ?? null;
  const bdcMarket = d?.bdcMarket ?? d?.bdcSummary ?? d?.bdcMonitor ?? [];
  const covenantMix = d?.covenantMix ?? d?.covenants ?? d?.covenantBreakdown ?? null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-4 bg-amber-400" />
          <span className="text-[10px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr(t, 'panelPrivateCreditDashboard', 'PRIVATE CREDIT DASHBOARD')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-[7px] text-neutral-600 uppercase tracking-wider hover:text-amber-400 transition-colors"
        >
          REFRESH
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* 1. Market Overview Cards */}
        <MarketOverviewSection overview={marketOverview} />

        {/* 2. Deal Pipeline Table */}
        {dealPipeline.length > 0 && <DealPipelineSection deals={dealPipeline} />}

        {/* 3. Default Rates by Vintage (SVG bar chart) */}
        {defaultRates.length > 0 && <DefaultRatesByVintageSection vintages={defaultRates} />}

        {/* 4. Sector Allocation Breakdown */}
        {sectorAllocation.length > 0 && (
          <SectorAllocationSection sectors={sectorAllocation} />
        )}

        {/* 5. Return Metrics */}
        <ReturnMetricsSection metrics={returnMetrics} />

        {/* 6. BDC Market Summary */}
        {bdcMarket.length > 0 && <BDCMarketSection bdcs={bdcMarket} />}

        {/* 7. Covenant Mix Indicator */}
        <CovenantMixSection mix={covenantMix} />
      </div>
    </div>
  );
}

// ── 1. Market Overview Cards ──

function MarketOverviewSection({ overview }: { overview: any }) {
  const cards = [
    {
      label: 'TOTAL AUM',
      value:
        overview?.totalAUM != null
          ? fmtDollarB(overview.totalAUM)
          : overview?.aum != null
            ? fmtDollarB(overview.aum)
            : '--',
      icon: DollarSign,
      sub: overview?.aumChange != null ? `${overview.aumChange >= 0 ? '+' : ''}${overview.aumChange.toFixed(1)}% YOY` : null,
      subColor: overview?.aumChange >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'DRY POWDER',
      value:
        overview?.dryPowder != null
          ? fmtDollarB(overview.dryPowder)
          : '--',
      icon: Target,
      sub: overview?.dryPowderPct != null ? `${overview.dryPowderPct.toFixed(0)}% OF AUM` : null,
      subColor: 'text-neutral-500',
    },
    {
      label: 'DEPLOYMENT PACE',
      value:
        overview?.deploymentPace != null
          ? fmtDollarB(overview.deploymentPace)
          : overview?.deployment != null
            ? fmtDollarB(overview.deployment)
            : '--',
      icon: TrendingUp,
      sub: overview?.deploymentChange != null ? `${overview.deploymentChange >= 0 ? '+' : ''}${overview.deploymentChange.toFixed(1)}% QOQ` : null,
      subColor: overview?.deploymentChange >= 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Market Overview" icon={BarChart3} />
      <div className="grid grid-cols-3 gap-px bg-amber-400/[0.06]">
        {cards.map((c) => (
          <div key={c.label} className="bg-black px-2 py-2">
            <div className="flex items-center gap-1 mb-0.5">
              <c.icon className="w-2.5 h-2.5 text-amber-400/50" />
              <span className="text-[6px] text-white/20 uppercase tracking-wider">
                {c.label}
              </span>
            </div>
            <div className="text-[12px] font-black text-amber-400">{c.value}</div>
            {c.sub && (
              <div className={`text-[7px] font-bold ${c.subColor}`}>{c.sub}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Deal Pipeline Table ──

function DealPipelineSection({ deals }: { deals: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Deal Pipeline" icon={Target} />

      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_56px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
          DEAL
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          SIZE
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          SPREAD
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          STRUCTURE
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          STATUS
        </span>
      </div>

      {/* Rows */}
      {deals.map((deal: any, idx: number) => (
        <div
          key={deal.name ?? deal.borrower ?? deal.deal ?? idx}
          className="grid grid-cols-[1fr_56px_56px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">
            {deal.name ?? deal.borrower ?? deal.deal}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">
            {deal.size != null
              ? fmtDollarAuto(deal.size)
              : deal.dealSize != null
                ? fmtDollarAuto(deal.dealSize)
                : '--'}
          </span>
          <span className="text-[8px] font-bold text-amber-400 text-right">
            {deal.spread != null ? fmtBp(deal.spread) : '--'}
          </span>
          <span className="text-[8px] text-neutral-400 text-right uppercase truncate">
            {deal.structure ?? deal.type ?? '--'}
          </span>
          <span className="text-right">
            <span
              className={`text-[7px] font-bold px-1 py-0 ${statusBadgeClass(deal.status ?? '')}`}
            >
              {deal.status?.toUpperCase() ?? 'TBD'}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Default Rates by Vintage (SVG bar chart) ──

function DefaultRatesByVintageSection({ vintages }: { vintages: any[] }) {
  const data = vintages.slice(-12);
  if (data.length === 0) return null;

  const values = data.map(
    (v: any) => v.defaultRate ?? v.rate ?? v.defaults ?? 0,
  );
  const maxVal = Math.max(...values, 1);
  const labels = data.map(
    (v: any) => String(v.vintage ?? v.year ?? v.label ?? ''),
  );

  const chartWidth = 280;
  const chartHeight = 64;
  const barGap = 3;
  const barWidth =
    (chartWidth - barGap * (data.length - 1)) / data.length;

  // Threshold lines
  const threshLow = 1;
  const threshHigh = 3;
  const yLow = chartHeight - (threshLow / maxVal) * chartHeight;
  const yHigh = chartHeight - (threshHigh / maxVal) * chartHeight;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Default Rates by Vintage" icon={BarChart3} />

      <div className="px-3 py-2">
        <svg
          width="100%"
          height={chartHeight + 18}
          viewBox={`0 0 ${chartWidth} ${chartHeight + 18}`}
          className="overflow-visible"
        >
          {/* Threshold lines */}
          {maxVal >= threshLow && (
            <line
              x1={0}
              y1={yLow}
              x2={chartWidth}
              y2={yLow}
              stroke="rgba(74,222,128,0.2)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          )}
          {maxVal >= threshHigh && (
            <line
              x1={0}
              y1={yHigh}
              x2={chartWidth}
              y2={yHigh}
              stroke="rgba(248,113,113,0.2)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
          )}

          {/* Bars */}
          {values.map((v: number, i: number) => {
            const barHeight = Math.max((v / maxVal) * chartHeight, 1);
            const x = i * (barWidth + barGap);
            const y = chartHeight - barHeight;

            const fill =
              v <= threshLow
                ? 'rgb(74,222,128)'
                : v <= threshHigh
                  ? 'rgb(251,191,36)'
                  : 'rgb(248,113,113)';

            return (
              <g key={i}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={fill}
                  opacity={0.4}
                />
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={1}
                  fill={fill}
                  opacity={0.9}
                />
                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 2}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.35)"
                  fontSize="5.5"
                  fontFamily="monospace"
                >
                  {v.toFixed(1)}%
                </text>
                {/* Year label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 10}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.2)"
                  fontSize="5.5"
                  fontFamily="monospace"
                >
                  {labels[i].slice(-2)}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        </svg>
      </div>
    </div>
  );
}

// ── 4. Sector Allocation Breakdown ──

function SectorAllocationSection({ sectors }: { sectors: any[] }) {
  const sorted = [...sectors].sort(
    (a: any, b: any) =>
      (b.allocation ?? b.weight ?? b.pct ?? 0) -
      (a.allocation ?? a.weight ?? a.pct ?? 0),
  );
  const total = sorted.reduce(
    (acc: number, s: any) => acc + (s.allocation ?? s.weight ?? s.pct ?? 0),
    0,
  );

  // SVG horizontal stacked bar
  const chartWidth = 280;
  const barHeight = 10;
  const colors = [
    'rgb(251,191,36)',
    'rgb(74,222,128)',
    'rgb(96,165,250)',
    'rgb(248,113,113)',
    'rgb(192,132,252)',
    'rgb(244,114,182)',
    'rgb(45,212,191)',
    'rgb(251,146,60)',
    'rgb(163,163,163)',
    'rgb(129,140,248)',
  ];

  let offsetX = 0;
  const segments = sorted.map((s: any, i: number) => {
    const pct = (s.allocation ?? s.weight ?? s.pct ?? 0) / (total || 1);
    const w = pct * chartWidth;
    const seg = { x: offsetX, w, color: colors[i % colors.length] };
    offsetX += w;
    return seg;
  });

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Sector Allocation" icon={PieChart} />

      {/* Stacked bar */}
      <div className="px-3 pt-2 pb-1">
        <svg
          width="100%"
          height={barHeight}
          viewBox={`0 0 ${chartWidth} ${barHeight}`}
          className="overflow-visible"
        >
          {segments.map((seg, i) => (
            <rect
              key={i}
              x={seg.x}
              y={0}
              width={Math.max(seg.w, 0.5)}
              height={barHeight}
              fill={seg.color}
              opacity={0.6}
            />
          ))}
        </svg>
      </div>

      {/* Legend grid */}
      <div className="grid grid-cols-2 gap-0 px-2 pb-1">
        {sorted.map((s: any, i: number) => {
          const pct = s.allocation ?? s.weight ?? s.pct ?? 0;
          return (
            <div
              key={s.sector ?? s.name ?? i}
              className="flex items-center justify-between px-1 py-[2px] hover:bg-amber-400/[0.02] transition-colors"
            >
              <div className="flex items-center gap-1 min-w-0">
                <div
                  className="w-1.5 h-1.5 shrink-0"
                  style={{ backgroundColor: colors[i % colors.length] }}
                />
                <span className="text-[7px] text-white/60 uppercase truncate">
                  {s.sector ?? s.name}
                </span>
              </div>
              <span className="text-[8px] font-bold text-white/80 shrink-0 ml-1">
                {fmtPct(pct, 1)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Return Metrics (IRR, MOIC, Yield) ──

function ReturnMetricsSection({ metrics }: { metrics: any }) {
  if (!metrics) return null;

  const rows = [
    {
      label: 'NET IRR',
      value: metrics.netIRR ?? metrics.irr ?? metrics.netIrr ?? null,
      fmt: (n: number) => fmtPct(n, 1),
      color: (n: number) => perfColor(n, 10, 6),
    },
    {
      label: 'GROSS IRR',
      value: metrics.grossIRR ?? metrics.grossIrr ?? null,
      fmt: (n: number) => fmtPct(n, 1),
      color: (n: number) => perfColor(n, 12, 8),
    },
    {
      label: 'MOIC',
      value: metrics.moic ?? metrics.MOIC ?? null,
      fmt: (n: number) => fmtX(n),
      color: (n: number) => perfColor(n, 1.3, 1.1),
    },
    {
      label: 'CURRENT YIELD',
      value: metrics.currentYield ?? metrics.yield ?? null,
      fmt: (n: number) => fmtPct(n, 1),
      color: () => 'text-amber-400',
    },
    {
      label: 'TOTAL RETURN',
      value: metrics.totalReturn ?? null,
      fmt: (n: number) => fmtPct(n, 1),
      color: (n: number) => perfColor(n, 10, 6),
    },
    {
      label: 'LOSS RATIO',
      value: metrics.lossRatio ?? metrics.lossRate ?? null,
      fmt: (n: number) => fmtPct(n, 2),
      color: (n: number) => defaultRateColor(n),
    },
  ];

  const validRows = rows.filter((r) => r.value != null);
  if (validRows.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Return Metrics" icon={TrendingUp} />

      <div className="grid grid-cols-3 gap-px bg-amber-400/[0.06]">
        {validRows.map((r) => (
          <div key={r.label} className="bg-black px-2 py-1.5">
            <div className="text-[6px] text-white/20 uppercase tracking-wider">
              {r.label}
            </div>
            <div className={`text-[11px] font-black ${r.color(r.value)}`}>
              {r.fmt(r.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 6. BDC Market Summary ──

function BDCMarketSection({ bdcs }: { bdcs: any[] }) {
  return (
    <div className="border-b border-border/20">
      <SectionHeader title="BDC Market Summary" icon={DollarSign} />

      {/* Header */}
      <div className="grid grid-cols-[1fr_60px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
          NAME
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          NAV P/D
        </span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">
          DIV YLD
        </span>
      </div>

      {/* Rows */}
      {bdcs.slice(0, 12).map((bdc: any, idx: number) => {
        const pd =
          bdc.premiumDiscount ??
          bdc.navPremiumDiscount ??
          bdc.premium ??
          bdc.discount ??
          0;
        const divYield =
          bdc.dividendYield ?? bdc.divYield ?? bdc.yield ?? 0;

        return (
          <div
            key={bdc.name ?? bdc.ticker ?? idx}
            className="grid grid-cols-[1fr_60px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-bold text-white truncate">
              {bdc.name ?? bdc.ticker}
            </span>
            <span
              className={`text-[8px] font-bold text-right ${premiumDiscountColor(pd)}`}
            >
              {pd >= 0 ? '+' : ''}
              {pd.toFixed(1)}%
            </span>
            <span className="text-[8px] font-bold text-amber-400 text-right">
              {fmtPct(divYield, 1)}
            </span>
          </div>
        );
      })}

      {/* Inline SVG: NAV P/D distribution mini chart */}
      {bdcs.length > 1 && <BDCNavChart bdcs={bdcs} />}
    </div>
  );
}

function BDCNavChart({ bdcs }: { bdcs: any[] }) {
  const data = bdcs.slice(0, 12).map((b: any) => ({
    label: b.ticker ?? (b.name ?? '').slice(0, 4).toUpperCase(),
    value:
      b.premiumDiscount ??
      b.navPremiumDiscount ??
      b.premium ??
      b.discount ??
      0,
  }));

  const chartWidth = 280;
  const chartHeight = 40;
  const barGap = 2;
  const barWidth = (chartWidth - barGap * (data.length - 1)) / data.length;
  const absMax = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const midY = chartHeight / 2;

  return (
    <div className="px-3 py-1.5">
      <div className="text-[6px] text-white/15 uppercase tracking-wider mb-1">
        NAV PREMIUM / DISCOUNT
      </div>
      <svg
        width="100%"
        height={chartHeight + 12}
        viewBox={`0 0 ${chartWidth} ${chartHeight + 12}`}
        className="overflow-visible"
      >
        {/* Center line */}
        <line
          x1={0}
          y1={midY}
          x2={chartWidth}
          y2={midY}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={0.5}
        />

        {data.map((item, i) => {
          const x = i * (barWidth + barGap);
          const barH = (Math.abs(item.value) / absMax) * (chartHeight / 2);
          const isPositive = item.value >= 0;
          const y = isPositive ? midY - barH : midY;
          const fill = isPositive ? 'rgb(74,222,128)' : 'rgb(248,113,113)';

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barH, 0.5)}
                fill={fill}
                opacity={0.45}
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.15)"
                fontSize="5"
                fontFamily="monospace"
              >
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── 7. Covenant Mix Indicator ──

function CovenantMixSection({ mix }: { mix: any }) {
  if (!mix) return null;

  const covLite = mix.covLite ?? mix.covenantLite ?? mix.lite ?? 0;
  const covHeavy = mix.covHeavy ?? mix.covenantHeavy ?? mix.heavy ?? 0;
  const moderate = mix.moderate ?? (100 - covLite - covHeavy);

  const segments = [
    { label: 'COV-LITE', pct: covLite, color: 'rgb(248,113,113)' },
    { label: 'MODERATE', pct: Math.max(moderate, 0), color: 'rgb(251,191,36)' },
    { label: 'COV-HEAVY', pct: covHeavy, color: 'rgb(74,222,128)' },
  ];

  const chartWidth = 280;
  const barHeight = 8;
  const total = segments.reduce((a, s) => a + s.pct, 0) || 1;

  let offsetX = 0;
  const bars = segments.map((s) => {
    const w = (s.pct / total) * chartWidth;
    const bar = { ...s, x: offsetX, w };
    offsetX += w;
    return bar;
  });

  return (
    <div className="border-b border-border/20">
      <SectionHeader title="Covenant Mix" icon={Shield} />

      <div className="px-3 py-2">
        {/* Stacked bar */}
        <svg
          width="100%"
          height={barHeight}
          viewBox={`0 0 ${chartWidth} ${barHeight}`}
          className="overflow-visible"
        >
          {bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={0}
              width={Math.max(b.w, 0.5)}
              height={barHeight}
              fill={b.color}
              opacity={0.5}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between mt-1.5">
          {segments.map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5"
                style={{ backgroundColor: s.color, opacity: 0.6 }}
              />
              <span className="text-[7px] text-white/40 uppercase tracking-wider">
                {s.label}
              </span>
              <span className="text-[8px] font-bold text-white/70">
                {fmtPct(s.pct, 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional covenant metrics if available */}
      {(mix.maintenanceCovenants != null || mix.incurrenceCovenants != null) && (
        <div className="grid grid-cols-2 gap-0 border-t border-border/5">
          {mix.maintenanceCovenants != null && (
            <div className="flex items-center justify-between px-2 py-[3px] hover:bg-amber-400/[0.02] transition-colors">
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
                MAINTENANCE
              </span>
              <span className="text-[8px] font-bold text-white/80">
                {fmtPct(mix.maintenanceCovenants, 0)}
              </span>
            </div>
          )}
          {mix.incurrenceCovenants != null && (
            <div className="flex items-center justify-between px-2 py-[3px] hover:bg-amber-400/[0.02] transition-colors">
              <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
                INCURRENCE
              </span>
              <span className="text-[8px] font-bold text-white/80">
                {fmtPct(mix.incurrenceCovenants, 0)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
