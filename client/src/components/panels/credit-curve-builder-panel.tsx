import { useState, useMemo } from 'react';
import {
  useCreditCurveBuilder,
  type CDSEntity,
  type CDSTenor,
  type HazardRateData,
  type HazardRatePoint,
  type CurveAnalytics,
  type BasisAnalysis,
} from '../../api/hooks/use-credit-curve-builder';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- Tab type --

type Tab = 'cds' | 'hazard' | 'analytics' | 'basis';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtBps(n: number): string {
  return n.toFixed(1);
}

function fmtBpsChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtPctSigned(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

// -- Color helpers --

function spreadChangeColor(n: number): string {
  // For spreads: widening (positive) is bad (red), tightening (negative) is good (green)
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function trendColor(trend: string): string {
  if (trend === 'tightening') return 'text-green-400';
  if (trend === 'widening') return 'text-red-400';
  return 'text-yellow-400';
}

function trendBg(trend: string): string {
  if (trend === 'tightening') return 'bg-green-500/10 border-green-500/30';
  if (trend === 'widening') return 'bg-red-500/10 border-red-500/30';
  return 'bg-yellow-500/10 border-yellow-500/30';
}

function basisTrendColor(trend: string): { text: string; bg: string } {
  if (trend === 'positive') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (trend === 'negative') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

function survivalColor(pct: number): string {
  if (pct >= 95) return 'text-green-400';
  if (pct >= 85) return 'text-yellow-400';
  return 'text-red-400';
}

// -- Main Panel --

export function CreditCurveBuilderPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useCreditCurveBuilder();
  const [tab, setTab] = useState<Tab>('cds');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'cds', label: tr(t, 'ccbCdsCurves', 'CDS Curves') },
    { key: 'hazard', label: tr(t, 'ccbHazardRates', 'Hazard Rates') },
    { key: 'analytics', label: tr(t, 'ccbAnalytics', 'Analytics') },
    { key: 'basis', label: tr(t, 'ccbBasis', 'Basis') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-yellow-400">
            {tr(t, 'ccbTitle', 'Credit Curve Builder')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data && <EntityBadge entity={data.entity} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === tb.key
                ? 'border-yellow-400 text-yellow-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'ccbError', 'Failed to load credit curve data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'ccbNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {tab === 'cds' && <CDSCurvesSection entity={data.entity} t={t} />}
            {tab === 'hazard' && <HazardRatesSection hazardRates={data.hazardRates} t={t} />}
            {tab === 'analytics' && <CurveAnalyticsSection analytics={data.analytics} t={t} />}
            {tab === 'basis' && <BasisAnalysisSection basis={data.basis} timestamp={data.timestamp} t={t} />}
          </>
        )}
      </div>
    </div>
  );
}

// -- Entity Badge --

function EntityBadge({ entity }: { entity: CDSEntity }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider text-yellow-400 bg-yellow-500/10 border border-yellow-500/30">
        {entity.rating}
      </span>
      <span className="text-[7px] font-mono text-neutral-600 uppercase">
        {entity.docClause}
      </span>
    </div>
  );
}

// -- Section 1: CDS Curves --

function CDSCurvesSection({
  entity,
  t,
}: {
  entity: CDSEntity;
  t: ReturnType<typeof useT>;
}) {
  const maxSpread = useMemo(
    () => Math.max(...entity.tenors.map((tn) => tn.spread), 1),
    [entity.tenors],
  );

  return (
    <div>
      {/* Entity Info */}
      <div className="border-b border-border/20">
        <div className="grid grid-cols-4 gap-px bg-border/10">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbEntity', 'Entity')}
            </div>
            <div className="text-[9px] font-mono font-bold text-white truncate">
              {entity.name}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbTicker', 'Ticker')}
            </div>
            <div className="text-[9px] font-mono font-bold text-yellow-400">
              {entity.ticker}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbSector', 'Sector')}
            </div>
            <div className="text-[9px] font-mono font-bold text-white truncate">
              {entity.sector}
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbRecovery', 'Recovery')}
            </div>
            <div className="text-[9px] font-mono font-bold text-white">
              {fmtPct(entity.recoveryRate)}
            </div>
          </div>
        </div>
      </div>

      {/* CDS Curve Chart */}
      <div className="border-b border-border/20 px-3 pt-2 pb-1">
        <CDSCurveChart tenors={entity.tenors} />
      </div>

      {/* Tenor Spread Table */}
      <div>
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbTenorSpreads', 'Tenor Spreads')}
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[56px_1fr_64px_64px_64px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'ccbTenor', 'Tenor')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccbSpread', 'Spread')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccb1dChg', '1D Chg')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccb1wChg', '1W Chg')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccbUpfront', 'Upfront')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">
            {tr(t, 'ccbBar', '')}
          </span>
        </div>

        {entity.tenors.map((tn, i) => (
          <div
            key={tn.tenor}
            className={`grid grid-cols-[56px_1fr_64px_64px_64px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-white">{tn.tenor}</span>
            <span className="text-[9px] font-mono font-bold text-yellow-300 text-right">
              {fmtBps(tn.spread)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadChangeColor(tn.change1d)}`}>
              {fmtBpsChange(tn.change1d)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadChangeColor(tn.change1w)}`}>
              {fmtBpsChange(tn.change1w)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtPctSigned(tn.upfront)}
            </span>
            <div className="flex justify-end pr-1">
              <div className="w-12 h-[3px] bg-neutral-800 relative">
                <div
                  className="absolute left-0 top-0 h-full bg-yellow-400/60"
                  style={{ width: `${Math.min((tn.spread / maxSpread) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- CDS Curve SVG Chart --

function CDSCurveChart({ tenors }: { tenors: CDSTenor[] }) {
  const chart = useMemo(() => {
    if (tenors.length < 2) return null;

    const W = 320;
    const H = 100;
    const PAD_L = 36;
    const PAD_R = 10;
    const PAD_T = 12;
    const PAD_B = 20;

    const spreads = tenors.map((tn) => tn.spread);
    const minS = Math.min(...spreads) * 0.9;
    const maxS = Math.max(...spreads) * 1.1;
    const rangeS = maxS - minS || 1;

    const scaleX = (i: number) => PAD_L + (i / (tenors.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxS - v) / rangeS) * (H - PAD_T - PAD_B);

    const points = tenors.map((tn, i) => ({
      x: scaleX(i),
      y: scaleY(tn.spread),
      data: tn,
    }));

    // Smooth curve
    const tension = 0.3;
    let pathD = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
      const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
      const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
      const cp2y = p2.y - (p3.y - p1.y) * tension / 3;
      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }

    const fillPath = `${pathD} L ${points[points.length - 1].x},${H - PAD_B} L ${points[0].x},${H - PAD_B} Z`;

    // Y ticks
    const yStep = rangeS > 200 ? 50 : rangeS > 100 ? 25 : rangeS > 50 ? 10 : 5;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minS / yStep) * yStep; v <= maxS; v += yStep) {
      yTicks.push(Math.round(v));
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, points, pathD, fillPath, yTicks, scaleY };
  }, [tenors]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, points, pathD, fillPath, yTicks, scaleY } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 110 }}>
      <defs>
        <linearGradient id="ccb-fill-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#facc15" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#facc15" stopOpacity={0.02} />
        </linearGradient>
      </defs>

      {/* Y grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={scaleY(v)}
            x2={W - PAD_R}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {v}
          </text>
        </g>
      ))}

      {/* X baseline */}
      <line
        x1={PAD_L}
        y1={H - PAD_B}
        x2={W - PAD_R}
        y2={H - PAD_B}
        stroke="rgba(255,255,255,0.08)"
      />

      {/* Fill area */}
      <path d={fillPath} fill="url(#ccb-fill-grad)" />

      {/* Curve line */}
      <path d={pathD} fill="none" stroke="#facc15" strokeWidth={1.5} />

      {/* Data points + X labels */}
      {points.map((p) => (
        <g key={p.data.tenor}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#facc15" />
          <text
            x={p.x}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={7}
            fontFamily="monospace"
          >
            {p.data.tenor}
          </text>
          <text
            x={p.x}
            y={p.y - 6}
            textAnchor="middle"
            fill="#facc15"
            fontSize={7}
            fontFamily="monospace"
            fontWeight="bold"
          >
            {p.data.spread.toFixed(0)}
          </text>
        </g>
      ))}
    </svg>
  );
}

// -- Section 2: Hazard Rates --

function HazardRatesSection({
  hazardRates,
  t,
}: {
  hazardRates: HazardRateData;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Recovery Assumption */}
      <div className="border-b border-border/20 px-3 py-1.5 bg-[#030303]">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbHazardRateAnalysis', 'Hazard Rate Analysis')}
          </span>
          <span className="text-[7px] font-mono text-yellow-400">
            {tr(t, 'ccbRecoveryAssumption', 'Recovery')}: {fmtPct(hazardRates.recoveryAssumption)}
          </span>
        </div>
      </div>

      {/* Survival Probability Chart */}
      <div className="border-b border-border/20 px-3 pt-2 pb-1">
        <SurvivalChart points={hazardRates.points} />
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[56px_1fr_1fr_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'ccbTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'ccbHazardRate', 'Hazard Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
          {tr(t, 'ccbCumDefault', 'Cum Default')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">
          {tr(t, 'ccbSurvivalProb', 'Survival')}
        </span>
      </div>

      {hazardRates.points.map((pt, i) => (
        <div
          key={pt.tenor}
          className={`grid grid-cols-[56px_1fr_1fr_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-white">{pt.tenor}</span>
          <span className="text-[9px] font-mono text-yellow-300 text-right">
            {fmtPct(pt.hazardRate)}
          </span>
          <span className="text-[9px] font-mono text-red-400/80 text-right">
            {fmtPct(pt.cumulativeDefault)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right pr-1 ${survivalColor(pt.survivalProb)}`}>
            {fmtPct(pt.survivalProb)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Survival Probability Chart --

function SurvivalChart({ points }: { points: HazardRatePoint[] }) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const W = 320;
    const H = 80;
    const PAD_L = 36;
    const PAD_R = 10;
    const PAD_T = 8;
    const PAD_B = 20;

    const values = points.map((p) => p.survivalProb);
    const minV = Math.min(...values) - 2;
    const maxV = 100;
    const rangeV = maxV - minV || 1;

    const scaleX = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxV - v) / rangeV) * (H - PAD_T - PAD_B);

    const pts = points.map((p, i) => ({
      x: scaleX(i),
      y: scaleY(p.survivalProb),
      data: p,
    }));

    const linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');

    const fillPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)},${H - PAD_B} L ${pts[0].x.toFixed(1)},${H - PAD_B} Z`;

    return { W, H, PAD_L, PAD_R, PAD_B, pts, linePath, fillPath, scaleY };
  }, [points]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, pts, linePath, fillPath, scaleY } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 90 }}>
      {/* Grid */}
      {[100, 95, 90, 85].map((v) => (
        <g key={v}>
          <line
            x1={PAD_L}
            y1={scaleY(v)}
            x2={W - PAD_R}
            y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)"
            strokeDasharray="2,3"
          />
          <text
            x={PAD_L - 4}
            y={scaleY(v) + 3}
            textAnchor="end"
            fill="rgba(255,255,255,0.25)"
            fontSize={7}
            fontFamily="monospace"
          >
            {v}%
          </text>
        </g>
      ))}

      {/* Fill */}
      <path d={fillPath} fill="rgba(74,222,128,0.06)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#4ade80" strokeWidth={1.5} />

      {/* Points + X labels */}
      {pts.map((p) => (
        <g key={p.data.tenor}>
          <circle cx={p.x} cy={p.y} r={2} fill="#4ade80" />
          <text
            x={p.x}
            y={H - PAD_B + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize={7}
            fontFamily="monospace"
          >
            {p.data.tenor}
          </text>
        </g>
      ))}
    </svg>
  );
}

// -- Section 3: Curve Analytics --

function CurveAnalyticsSection({
  analytics,
  t,
}: {
  analytics: CurveAnalytics;
  t: ReturnType<typeof useT>;
}) {
  const slopeMetrics = [
    {
      label: tr(t, 'ccbSlope1s5s', '1Y/5Y Slope'),
      value: `${fmtBpsChange(analytics.slope1s5s)} bp`,
      color: analytics.slope1s5s >= 0 ? 'text-yellow-300' : 'text-red-400',
    },
    {
      label: tr(t, 'ccbSlope5s10s', '5Y/10Y Slope'),
      value: `${fmtBpsChange(analytics.slope5s10s)} bp`,
      color: analytics.slope5s10s >= 0 ? 'text-yellow-300' : 'text-red-400',
    },
    {
      label: tr(t, 'ccbCurvature', 'Curvature'),
      value: `${fmtBpsChange(analytics.curvature)} bp`,
      color: Math.abs(analytics.curvature) > 20 ? 'text-red-400' : 'text-yellow-300',
    },
  ];

  const rollDownMetrics = [
    {
      label: tr(t, 'ccbRollDown3m', '3M Roll-Down'),
      value: `${fmtBpsChange(analytics.rollDown3m)} bp`,
      color: analytics.rollDown3m < 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: tr(t, 'ccbRollDown6m', '6M Roll-Down'),
      value: `${fmtBpsChange(analytics.rollDown6m)} bp`,
      color: analytics.rollDown6m < 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  const carryMetrics = [
    {
      label: tr(t, 'ccbCarry3m', '3M Carry'),
      value: `${fmtBpsChange(analytics.carry3m)} bp`,
      color: analytics.carry3m > 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: tr(t, 'ccbCarry6m', '6M Carry'),
      value: `${fmtBpsChange(analytics.carry6m)} bp`,
      color: analytics.carry6m > 0 ? 'text-green-400' : 'text-red-400',
    },
  ];

  const riskMetrics = [
    {
      label: tr(t, 'ccbDV01', 'DV01'),
      value: `$${analytics.dv01.toFixed(0)}`,
      color: 'text-white',
    },
    {
      label: tr(t, 'ccbConvexity', 'Convexity'),
      value: analytics.convexity.toFixed(3),
      color: 'text-white',
    },
  ];

  return (
    <div>
      {/* Slope / Curvature */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbSlopeCurvature', 'Slope & Curvature')}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-border/10">
          {slopeMetrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.label}
              </div>
              <div className={`text-[10px] font-mono font-bold ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Roll-Down */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbRollDown', 'Roll-Down')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {rollDownMetrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.label}
              </div>
              <div className={`text-[10px] font-mono font-bold ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carry */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbCarry', 'Carry')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {carryMetrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.label}
              </div>
              <div className={`text-[10px] font-mono font-bold ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="border-b border-border/20">
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbRiskMetrics', 'Risk Metrics')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border/10">
          {riskMetrics.map((m) => (
            <div key={m.label} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {m.label}
              </div>
              <div className={`text-[10px] font-mono font-bold ${m.color}`}>
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -- Section 4: Basis Analysis --

function BasisAnalysisSection({
  basis,
  timestamp,
  t,
}: {
  basis: BasisAnalysis;
  timestamp: string;
  t: ReturnType<typeof useT>;
}) {
  const basisStyle = basisTrendColor(basis.basisTrend);

  return (
    <div>
      {/* Summary */}
      <div className="border-b border-border/20">
        <div className="grid grid-cols-2 gap-px bg-border/10">
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbAvgBasis', 'Avg CDS-Bond Basis')}
            </div>
            <div className="text-[10px] font-mono font-bold text-white">
              {fmtBpsChange(basis.avgBasis)} bp
            </div>
          </div>
          <div className="bg-black px-2 py-1.5">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'ccbBasisTrend', 'Basis Trend')}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1 py-px text-[7px] font-mono font-black uppercase border ${basisStyle.text} ${basisStyle.bg}`}>
                {basis.basisTrend.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Basis Table */}
      <div>
        <div className="px-3 py-1 border-b border-border/10">
          <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
            {tr(t, 'ccbBasisByTenor', 'Basis by Tenor')}
          </span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[56px_1fr_1fr_1fr_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'ccbTenor', 'Tenor')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccbCdsBasis', 'CDS Basis')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccbZSpread', 'Z-Spread')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">
            {tr(t, 'ccbASW', 'ASW')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">
            {tr(t, 'ccbTrendLabel', 'Trend')}
          </span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">
            {tr(t, 'ccb1wChg', '1W Chg')}
          </span>
        </div>

        {basis.points.map((pt, i) => (
          <div
            key={pt.tenor}
            className={`grid grid-cols-[56px_1fr_1fr_1fr_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-yellow-400/[0.02] transition-colors items-center ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold text-white">{pt.tenor}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${pt.cdsBasis >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtBpsChange(pt.cdsBasis)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtBps(pt.zSpread)}
            </span>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtBps(pt.assetSwapSpread)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[7px] font-mono font-bold uppercase px-1 py-px border ${trendColor(pt.trend)} ${trendBg(pt.trend)}`}>
                {pt.trend === 'tightening' ? 'TIGHT' : pt.trend === 'widening' ? 'WIDE' : 'FLAT'}
              </span>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right pr-1 ${spreadChangeColor(pt.change1w)}`}>
              {fmtBpsChange(pt.change1w)}
            </span>
          </div>
        ))}
      </div>

      {/* Timestamp */}
      <div className="px-3 py-2">
        <div className="pt-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'ccbLastUpdate', 'Last update')}: {new Date(timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}
