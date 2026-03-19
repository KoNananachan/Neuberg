import { useState } from 'react';
import { useCreditIndexTranches } from '../../api/hooks/use-credit-index-tranches';
import { useT } from '../../i18n';
import { RefreshCw, Layers, TrendingUp, BarChart3, ArrowRightLeft, Activity } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Index tab types ──

type IndexTab = 'CDX_IG' | 'CDX_HY' | 'ITRAXX_MAIN' | 'ITRAXX_XOVER';

const INDEX_TAB_LABELS: Record<IndexTab, string> = {
  CDX_IG: 'CDX IG',
  CDX_HY: 'CDX HY',
  ITRAXX_MAIN: 'iTraxx Main',
  ITRAXX_XOVER: 'iTraxx Xover',
};

// ── Tranche line colors for charts ──

const TRANCHE_LINE_COLORS = [
  '#fb7185', // rose-400
  '#f472b6', // pink-400
  '#c084fc', // purple-400
  '#818cf8', // indigo-400
  '#38bdf8', // sky-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#fb923c', // orange-400
];

// ── Formatting helpers ──

function fmtBp(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(1);
}

function fmtChange(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '--';
  return n.toFixed(decimals);
}

function fmtX(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '--';
  return `${n.toFixed(1)}x`;
}

// ── Color helpers ──

function spreadChangeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadChangeBg(n: number | null | undefined): string {
  if (n == null) return 'bg-neutral-500/10';
  if (n > 0) return 'bg-red-400/10';
  if (n < 0) return 'bg-green-400/10';
  return 'bg-neutral-500/10';
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
      {Icon && <Icon className="w-3 h-3 text-rose-400/60" />}
      <div className="w-[2px] h-3 bg-rose-400" />
      <span className="text-[8px] font-black font-mono uppercase tracking-wider text-rose-400">
        {title}
      </span>
    </div>
  );
}

// ── Main Panel ──

export function CreditIndexTranchesPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCreditIndexTranches();
  const [activeTab, setActiveTab] = useState<IndexTab>('CDX_IG');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-rose-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-rose-400">
            {tr(t, 'citTitle', 'Credit Index Tranches')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-rose-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Index Tabs */}
      <div className="flex border-b border-border/20 bg-black/40 shrink-0">
        {(Object.keys(INDEX_TAB_LABELS) as IndexTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {INDEX_TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-rose-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!d && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'citNoData', 'No data available')}
          </div>
        )}

        {d && (
          <>
            <IndexOverviewCards data={d} activeTab={activeTab} t={t} />
            <TrancheSpreadTable data={d} activeTab={activeTab} t={t} />
            <BaseCorrelationCurve data={d} activeTab={activeTab} t={t} />
            <HistoricalTrancheSpreadChart data={d} activeTab={activeTab} t={t} />
            <RollAnalysisSection data={d} activeTab={activeTab} t={t} />
          </>
        )}
      </div>

      {/* Timestamp */}
      {d?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10 shrink-0">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'citLastUpdate', 'Last update')}: {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Section 1: Index Overview Cards
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IndexOverviewCards({ data, activeTab, t }: { data: any; activeTab: IndexTab; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const overview: any[] = data?.indexOverview ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeData = overview.find((o: any) => o?.key === activeTab || o?.id === activeTab);

  const cards = [
    {
      label: 'CDX IG',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spread: overview.find((o: any) => o?.key === 'CDX_IG' || o?.name?.includes('CDX IG'))?.spread,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      change: overview.find((o: any) => o?.key === 'CDX_IG' || o?.name?.includes('CDX IG'))?.change,
      active: activeTab === 'CDX_IG',
    },
    {
      label: 'CDX HY',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spread: overview.find((o: any) => o?.key === 'CDX_HY' || o?.name?.includes('CDX HY'))?.spread,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      change: overview.find((o: any) => o?.key === 'CDX_HY' || o?.name?.includes('CDX HY'))?.change,
      active: activeTab === 'CDX_HY',
    },
    {
      label: 'iTraxx Main',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spread: overview.find((o: any) => o?.key === 'ITRAXX_MAIN' || o?.name?.includes('iTraxx Main'))?.spread,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      change: overview.find((o: any) => o?.key === 'ITRAXX_MAIN' || o?.name?.includes('iTraxx Main'))?.change,
      active: activeTab === 'ITRAXX_MAIN',
    },
    {
      label: 'iTraxx Xover',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spread: overview.find((o: any) => o?.key === 'ITRAXX_XOVER' || o?.name?.includes('iTraxx Xover'))?.spread,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      change: overview.find((o: any) => o?.key === 'ITRAXX_XOVER' || o?.name?.includes('iTraxx Xover'))?.change,
      active: activeTab === 'ITRAXX_XOVER',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'citOverview', 'Index Overview')} icon={Activity} />
      <div className="grid grid-cols-4 gap-px bg-border/10">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`px-2 py-2 bg-black ${card.active ? 'border-b-2 border-rose-400' : ''}`}
          >
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
              {card.label}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-[11px] font-mono font-bold text-white">
                {fmtBp(card.spread)}
              </span>
              <span className="text-[7px] font-mono text-neutral-600">bp</span>
            </div>
            <div className="mt-0.5">
              <span
                className={`text-[8px] font-mono font-bold px-1 py-px ${spreadChangeColor(card.change)} ${spreadChangeBg(card.change)}`}
              >
                {fmtChange(card.change)} bp
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Active index additional details */}
      {activeData && (
        <div className="grid grid-cols-5 gap-px bg-border/10 border-t border-border/10">
          {[
            { label: tr(t, 'citSeries', 'Series'), value: activeData.series ?? '--' },
            { label: tr(t, 'citMaturity', 'Maturity'), value: activeData.maturity ?? '--' },
            { label: tr(t, 'citCoupon', 'Coupon'), value: activeData.coupon != null ? `${fmtBp(activeData.coupon)}bp` : '--' },
            { label: tr(t, 'citImplDefault', 'Impl Default'), value: fmtPct(activeData.impliedDefault) },
            { label: tr(t, 'citRecovery', 'Recovery'), value: fmtPct(activeData.recovery) },
          ].map((item) => (
            <div key={item.label} className="px-2 py-1.5 bg-black">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                {item.label}
              </div>
              <div className="text-[9px] font-mono font-bold text-neutral-300 mt-0.5">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Section 2: Tranche Spread Table
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TrancheSpreadTable({ data, activeTab, t }: { data: any; activeTab: IndexTab; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTranches: any = data?.tranches ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tranches: any[] = allTranches[activeTab] ?? allTranches?.default ?? data?.trancheData ?? [];

  if (!tranches || tranches.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'citTrancheSpreads', 'Tranche Spreads')} icon={Layers} />
      <div className="overflow-x-auto">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-black/95 z-10">
            <tr className="text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <th className="px-2 py-1 text-left font-bold">{tr(t, 'citAttach', 'Attach')}</th>
              <th className="px-2 py-1 text-left font-bold">{tr(t, 'citDetach', 'Detach')}</th>
              <th className="px-2 py-1 text-center font-bold">{tr(t, 'citTranche', 'Tranche')}</th>
              <th className="px-2 py-1 text-right font-bold">{tr(t, 'citSpread', 'Spread')}</th>
              <th className="px-2 py-1 text-right font-bold">{tr(t, 'citChg', 'Chg')}</th>
              <th className="px-2 py-1 text-right font-bold">{tr(t, 'citDelta', 'Delta')}</th>
              <th className="px-2 py-1 text-right font-bold">{tr(t, 'citLeverage', 'Leverage')}</th>
              <th className="px-2 py-1 text-right font-bold">{tr(t, 'citExpLoss', 'Exp Loss')}</th>
            </tr>
          </thead>
          <tbody>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {tranches.map((row: any, i: number) => {
              const trancheLabel = row?.tranche ??
                (row?.attachment != null && row?.detachment != null
                  ? `${fmtPct(row.attachment, 0)}-${fmtPct(row.detachment, 0)}`
                  : `T${i + 1}`);
              return (
                <tr
                  key={trancheLabel + i}
                  className="border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors"
                >
                  <td className="px-2 py-1 text-white">
                    {fmtPct(row?.attachment)}
                  </td>
                  <td className="px-2 py-1 text-white">
                    {fmtPct(row?.detachment)}
                  </td>
                  <td className="px-2 py-1 text-center">
                    <span className="text-rose-400 font-bold">{trancheLabel}</span>
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBp(row?.spread)} <span className="text-neutral-600 text-[7px]">bp</span>
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(row?.change)}`}>
                    {fmtChange(row?.change)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtNum(row?.delta, 3)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-300 font-bold">
                    {fmtX(row?.leverage)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtPct(row?.expectedLoss)}
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

// ══════════════════════════════════════════════════════════════════
// ── Section 3: Base Correlation Curve (SVG Line Chart)
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BaseCorrelationCurve({ data, activeTab, t }: { data: any; activeTab: IndexTab; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCurves: any = data?.baseCorrelation ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const points: any[] = allCurves[activeTab] ?? allCurves?.default ?? data?.baseCorrelationCurve ?? [];

  if (!points || points.length === 0) return null;

  const chartW = 280;
  const chartH = 120;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detachments = points.map((p: any) => p?.detachment ?? p?.x ?? 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const correlations = points.map((p: any) => p?.correlation ?? p?.baseCorrelation ?? p?.y ?? 0);

  const minX = Math.min(...detachments);
  const maxX = Math.max(...detachments);
  const minY = Math.min(...correlations) * 0.9;
  const maxY = Math.max(...correlations) * 1.1;

  const scaleX = (v: number) => padL + ((v - minX) / (maxX - minX || 1)) * plotW;
  const scaleY = (v: number) => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

  const pathData = points
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((p: any, i: number) => {
      const x = scaleX(p?.detachment ?? p?.x ?? 0);
      const y = scaleY(p?.correlation ?? p?.baseCorrelation ?? p?.y ?? 0);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');

  // Area fill under the curve
  const firstX = scaleX(detachments[0]);
  const lastX = scaleX(detachments[detachments.length - 1]);
  const areaPath = `${pathData} L${lastX},${padT + plotH} L${firstX},${padT + plotH} Z`;

  // Y-axis grid lines
  const yTicks = 5;
  const yStep = (maxY - minY) / yTicks;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'citBaseCorrelation', 'Base Correlation Curve')} icon={TrendingUp} />
      <div className="px-3 py-2">
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const val = minY + i * yStep;
            const y = scaleY(val);
            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={y}
                  x2={chartW - padR}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={0.5}
                />
                <text
                  x={padL - 3}
                  y={y + 2}
                  fill="rgba(255,255,255,0.2)"
                  fontSize="6"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {points.map((p: any, i: number) => {
            const x = scaleX(p?.detachment ?? p?.x ?? 0);
            return (
              <text
                key={i}
                x={x}
                y={chartH - 2}
                fill="rgba(255,255,255,0.25)"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {fmtPct(p?.detachment ?? p?.x, 0)}
              </text>
            );
          })}

          {/* Area fill */}
          <path d={areaPath} fill="rgba(251,113,133,0.08)" />

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#fb7185"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Data points */}
          {points.map((p: any, i: number) => {
            const x = scaleX(p?.detachment ?? p?.x ?? 0);
            const y = scaleY(p?.correlation ?? p?.baseCorrelation ?? p?.y ?? 0);
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={2.5} fill="#fb7185" opacity={0.8} />
                <circle cx={x} cy={y} r={1} fill="white" />
              </g>
            );
          })}
        </svg>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'citDetachmentPt', 'Detachment Point')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'citCorrelation', 'Base Correlation %')}
          </span>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Section 4: Historical Tranche Spread Chart (SVG Multi-Line, 30 Days)
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoricalTrancheSpreadChart({ data, activeTab, t }: { data: any; activeTab: IndexTab; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allHistory: any = data?.historicalSpreads ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const history: any = allHistory[activeTab] ?? allHistory?.default ?? data?.historicalTrancheData ?? null;

  if (!history) return null;

  // Expected shape: { dates: string[], series: [{ name: string, values: number[] }] }
  const dates: string[] = history?.dates ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const series: any[] = history?.series ?? [];

  if (dates.length === 0 || series.length === 0) return null;

  const chartW = 280;
  const chartH = 140;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 20;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allVals = series.flatMap((s: any) => (s?.values ?? []) as number[]);
  const minY = Math.min(...allVals) * 0.95;
  const maxY = Math.max(...allVals) * 1.05;

  const scaleX = (i: number) => padL + (i / Math.max(dates.length - 1, 1)) * plotW;
  const scaleY = (v: number) => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH;

  // Y-axis grid
  const yTicks = 4;
  const yStep = (maxY - minY) / yTicks;

  // X-axis labels: show ~5 evenly spaced dates
  const xLabelCount = Math.min(5, dates.length);
  const xLabelStep = Math.max(Math.floor((dates.length - 1) / (xLabelCount - 1)), 1);

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'citHistoricalSpreads', 'Historical Tranche Spreads (30D)')} icon={BarChart3} />
      <div className="px-3 py-2">
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const val = minY + i * yStep;
            const y = scaleY(val);
            return (
              <g key={i}>
                <line
                  x1={padL}
                  y1={y}
                  x2={chartW - padR}
                  y2={y}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth={0.5}
                />
                <text
                  x={padL - 3}
                  y={y + 2}
                  fill="rgba(255,255,255,0.2)"
                  fontSize="6"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {Array.from({ length: xLabelCount }, (_, i) => {
            const idx = Math.min(i * xLabelStep, dates.length - 1);
            const x = scaleX(idx);
            const label = dates[idx]?.slice(-5) ?? '';
            return (
              <text
                key={i}
                x={x}
                y={chartH - 2}
                fill="rgba(255,255,255,0.2)"
                fontSize="6"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}

          {/* Series lines */}
          {series.map((s: any, si: number) => {
            const vals: number[] = s?.values ?? [];
            if (vals.length === 0) return null;
            const color = TRANCHE_LINE_COLORS[si % TRANCHE_LINE_COLORS.length];
            const pathD = vals
              .map((v: number, i: number) => {
                const x = scaleX(i);
                const y = scaleY(v);
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
              })
              .join(' ');
            return (
              <path
                key={si}
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.8}
              />
            );
          })}
        </svg>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5">
          {series.map((s: any, si: number) => {
            const color = TRANCHE_LINE_COLORS[si % TRANCHE_LINE_COLORS.length];
            return (
              <div key={si} className="flex items-center gap-1">
                <div className="w-3 h-[2px]" style={{ backgroundColor: color, opacity: 0.8 }} />
                <span className="text-[7px] font-mono text-neutral-500 uppercase">
                  {s?.name ?? `T${si + 1}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
// ── Section 5: Roll Analysis Comparison
// ══════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RollAnalysisSection({ data, activeTab, t }: { data: any; activeTab: IndexTab; t: TFn }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRolls: any = data?.rollAnalysis ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rolls: any[] = allRolls[activeTab] ?? allRolls?.default ?? data?.rollData ?? [];

  if (!rolls || rolls.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <SectionHeader title={tr(t, 'citRollAnalysis', 'Roll Analysis')} icon={ArrowRightLeft} />

      {/* Roll comparison cards */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {rolls.map((roll: any, i: number) => {
          const isPositive = (roll?.rollSpread ?? 0) < 0;
          return (
            <div key={`${roll?.series ?? roll?.name}-${i}`} className="px-2 py-2 bg-black hover:bg-rose-400/[0.02]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-mono font-bold text-rose-400 uppercase">
                  {roll?.series ?? roll?.name ?? `Roll ${i + 1}`}
                </span>
                <span
                  className={`text-[7px] font-mono font-bold px-1 py-px uppercase ${
                    isPositive
                      ? 'text-green-400 bg-green-400/10'
                      : 'text-red-400 bg-red-400/10'
                  }`}
                >
                  {roll?.direction ?? (isPositive ? 'TIGHTENING' : 'WIDENING')}
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="flex justify-between">
                  <span className="text-[7px] font-mono text-neutral-600 uppercase">
                    {tr(t, 'citOtrSpread', 'OTR Spread')}
                  </span>
                  <span className="text-[8px] font-mono font-bold text-white">
                    {fmtBp(roll?.otrSpread)} <span className="text-neutral-600 text-[7px]">bp</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[7px] font-mono text-neutral-600 uppercase">
                    {tr(t, 'citOfrSpread', 'OFR Spread')}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400">
                    {fmtBp(roll?.ofrSpread)} <span className="text-neutral-600 text-[7px]">bp</span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[7px] font-mono text-neutral-600 uppercase">
                    {tr(t, 'citRollSpread', 'Roll Spread')}
                  </span>
                  <span className={`text-[8px] font-mono font-bold ${spreadChangeColor(roll?.rollSpread)}`}>
                    {fmtChange(roll?.rollSpread)} bp
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[7px] font-mono text-neutral-600 uppercase">
                    {tr(t, 'citDaysToRoll', 'Days to Roll')}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-300">
                    {roll?.daysToRoll ?? '--'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[7px] font-mono text-neutral-600 uppercase">
                    {tr(t, 'citRollCost', 'Roll Cost')}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-400">
                    {fmtBp(roll?.rollCost)} bp
                  </span>
                </div>
              </div>

              {/* Mini roll spread bar visualization */}
              {roll?.otrSpread != null && roll?.ofrSpread != null && (
                <div className="mt-1.5">
                  <RollSpreadMiniBar otr={roll.otrSpread} ofr={roll.ofrSpread} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Roll comparison table */}
      {rolls.length > 1 && (
        <div className="overflow-x-auto border-t border-border/10">
          <table className="w-full text-[9px] font-mono">
            <thead className="bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
              <tr>
                <th className="px-2 py-1 text-left font-bold">{tr(t, 'citSeries', 'Series')}</th>
                <th className="px-2 py-1 text-right font-bold">{tr(t, 'citOtr', 'OTR')}</th>
                <th className="px-2 py-1 text-right font-bold">{tr(t, 'citOfr', 'OFR')}</th>
                <th className="px-2 py-1 text-right font-bold">{tr(t, 'citRoll', 'Roll')}</th>
                <th className="px-2 py-1 text-right font-bold">{tr(t, 'citCost', 'Cost')}</th>
                <th className="px-2 py-1 text-right font-bold">{tr(t, 'citDays', 'Days')}</th>
              </tr>
            </thead>
            <tbody>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {rolls.map((roll: any, i: number) => (
                <tr
                  key={`roll-row-${i}`}
                  className="border-b border-border/5 hover:bg-rose-400/[0.02]"
                >
                  <td className="px-2 py-1 text-rose-400 font-bold">
                    {roll?.series ?? roll?.name ?? '--'}
                  </td>
                  <td className="px-2 py-1 text-right text-white font-bold">
                    {fmtBp(roll?.otrSpread)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtBp(roll?.ofrSpread)}
                  </td>
                  <td className={`px-2 py-1 text-right font-bold ${spreadChangeColor(roll?.rollSpread)}`}>
                    {fmtChange(roll?.rollSpread)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {fmtBp(roll?.rollCost)}
                  </td>
                  <td className="px-2 py-1 text-right text-neutral-400">
                    {roll?.daysToRoll ?? '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Mini bar showing OTR vs OFR spread comparison ──

function RollSpreadMiniBar({ otr, ofr }: { otr: number; ofr: number }) {
  const maxVal = Math.max(otr, ofr, 1);

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <span className="text-[6px] font-mono text-neutral-600 w-6 shrink-0">OTR</span>
        <div className="flex-1 h-[3px] bg-neutral-900 relative">
          <div
            className="absolute inset-y-0 left-0 bg-rose-400/40"
            style={{ width: `${(otr / maxVal) * 100}%` }}
          />
          <div
            className="absolute top-0 left-0 h-[1px] bg-rose-400/70"
            style={{ width: `${(otr / maxVal) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[6px] font-mono text-neutral-600 w-6 shrink-0">OFR</span>
        <div className="flex-1 h-[3px] bg-neutral-900 relative">
          <div
            className="absolute inset-y-0 left-0 bg-neutral-500/30"
            style={{ width: `${(ofr / maxVal) * 100}%` }}
          />
          <div
            className="absolute top-0 left-0 h-[1px] bg-neutral-500/50"
            style={{ width: `${(ofr / maxVal) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
