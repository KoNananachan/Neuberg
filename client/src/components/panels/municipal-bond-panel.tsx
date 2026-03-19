import { useMemo } from 'react';
import { useMunicipalBond } from '../../api/hooks/use-municipal-bond';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Formatting helpers ──

function fmtBillions(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1) return n.toFixed(1) + 'B';
  if (Math.abs(n) >= 0.001) return (n * 1_000).toFixed(0) + 'M';
  return n.toFixed(2);
}

function fmtYield(n: number): string {
  return n.toFixed(3) + '%';
}

function fmtBps(n: number): string {
  return n.toFixed(0) + 'bp';
}

function fmtPct(n: number, signed = false): string {
  const sign = signed && n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtAmount(n: number): string {
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + 'B';
  return n.toFixed(0) + 'M';
}

// ── Main Panel ──

export function MunicipalBondPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useMunicipalBond();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {tr(t, 'panelMunicipalBond', 'Municipal Bonds')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING MUNICIPAL BOND DATA...
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'error', 'Error loading data')}
          </div>
        )}

        {data && (
          <>
            <MarketMetricsBanner data={data} t={t} />
            <YieldCurveSection data={data} t={t} />
            <StateBreakdownSection data={data} t={t} />
            <SectorDataSection data={data} t={t} />
            <TaxEquivalentGrid data={data} t={t} />
            <NewIssuanceSection data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Market Metrics Banner ──

function MarketMetricsBanner({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const metrics = data.marketMetrics ?? data.metrics ?? {};
  const items = [
    {
      label: tr(t, 'mbTotalOutstanding', 'Total Outstanding'),
      value: fmtBillions(metrics.totalOutstanding ?? 4020),
    },
    {
      label: tr(t, 'mbYtdIssuance', 'YTD Issuance'),
      value: fmtBillions(metrics.ytdIssuance ?? 285),
    },
    {
      label: tr(t, 'mbNetFlows', 'Net Flows'),
      value: fmtBillions(metrics.netFlows ?? 12.4),
      color: (metrics.netFlows ?? 12.4) >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: tr(t, 'mbAvgDuration', 'Avg Duration'),
      value: (metrics.avgDuration ?? 5.2).toFixed(1) + 'Y',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-border/10 border-b border-border/20">
      {items.map((m) => (
        <div key={m.label} className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {m.label}
          </div>
          <div className={`text-[12px] font-mono font-black ${m.color ?? 'text-white'}`}>
            {m.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── AAA GO Yield Curve ──

function YieldCurveSection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const yieldCurve: Array<{
    tenor: string;
    yield: number;
    treasuryYield?: number;
    ratio?: number;
  }> = data.yieldCurve ?? data.aaaYieldCurve ?? [];

  if (yieldCurve.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'mbAaaGoYieldCurve', 'AAA GO Yield Curve')}
        </span>
      </div>

      {/* Mini SVG Chart */}
      <div className="px-3 py-2">
        <YieldCurveChart points={yieldCurve} />
      </div>

      {/* Tenor Table */}
      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'mbTenor', 'Tenor')}</span>
        <span className="text-right">{tr(t, 'mbYield', 'Yield')}</span>
        <span className="text-right">{tr(t, 'mbTreasury', 'TSY')}</span>
        <span className="text-right">{tr(t, 'mbRatio', 'Muni/TSY')}</span>
      </div>
      {yieldCurve.map((row) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.tenor}</span>
          <span className="text-[9px] font-mono text-cyan-300 text-right">
            {fmtYield(row.yield)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {row.treasuryYield != null ? fmtYield(row.treasuryYield) : '--'}
          </span>
          <span className="text-[9px] font-mono text-amber-400 text-right">
            {row.ratio != null ? (row.ratio * 100).toFixed(0) + '%' : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

function YieldCurveChart({
  points,
}: {
  points: Array<{ tenor: string; yield: number }>;
}) {
  const chart = useMemo(() => {
    if (points.length < 2) return null;

    const W = 320;
    const H = 80;
    const PAD_L = 32;
    const PAD_R = 10;
    const PAD_T = 10;
    const PAD_B = 18;

    const yields = points.map((p) => p.yield);
    const minY = Math.min(...yields) - 0.1;
    const maxY = Math.max(...yields) + 0.1;
    const rangeY = maxY - minY || 1;

    const scaleX = (i: number) => PAD_L + (i / (points.length - 1)) * (W - PAD_L - PAD_R);
    const scaleY = (v: number) => PAD_T + ((maxY - v) / rangeY) * (H - PAD_T - PAD_B);

    const pts = points.map((p, i) => ({ x: scaleX(i), y: scaleY(p.yield), data: p }));

    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fillPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)},${H - PAD_B} L ${pts[0].x.toFixed(1)},${H - PAD_B} Z`;

    // Y ticks
    const yStep = rangeY > 2 ? 0.5 : rangeY > 1 ? 0.25 : 0.1;
    const yTicks: number[] = [];
    for (let v = Math.ceil(minY / yStep) * yStep; v <= maxY; v += yStep) {
      yTicks.push(Math.round(v * 1000) / 1000);
    }

    return { W, H, PAD_L, PAD_R, PAD_T, PAD_B, pts, linePath, fillPath, yTicks, scaleY };
  }, [points]);

  if (!chart) return null;

  const { W, H, PAD_L, PAD_R, PAD_B, pts, linePath, fillPath, yTicks, scaleY } = chart;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 100 }}>
      <defs>
        <linearGradient id="mb-yc-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
        </linearGradient>
      </defs>

      {/* Y grid */}
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_L} y1={scaleY(v)} x2={W - PAD_R} y2={scaleY(v)}
            stroke="rgba(255,255,255,0.04)" strokeDasharray="2,3"
          />
          <text x={PAD_L - 3} y={scaleY(v) + 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize={6} fontFamily="monospace">
            {v.toFixed(2)}
          </text>
        </g>
      ))}

      {/* Fill */}
      <path d={fillPath} fill="url(#mb-yc-fill)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#22d3ee" strokeWidth={1.5} />

      {/* Points and X labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={2.5} fill="#22d3ee" />
          <text x={p.x} y={H - 2} textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize={6} fontFamily="monospace">
            {p.data.tenor}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── State Breakdown Table ──

function StateBreakdownSection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const states: Array<{
    state: string;
    avgYield: number;
    spread: number;
    creditRating: string;
    outstandingDebt: number;
    revenueGrowth: number;
  }> = data.stateBreakdown ?? data.states ?? [];

  if (states.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'mbStateBreakdown', 'State Breakdown')}
        </span>
      </div>

      <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'mbState', 'State')}</span>
        <span className="text-right">{tr(t, 'mbAvgYield', 'Avg Yld')}</span>
        <span className="text-right">{tr(t, 'mbSpread', 'Sprd')}</span>
        <span className="text-center">{tr(t, 'mbRating', 'Rating')}</span>
        <span className="text-right">{tr(t, 'mbDebt', 'Outst Debt')}</span>
        <span className="text-right">{tr(t, 'mbRevGrowth', 'Rev Grwth')}</span>
      </div>

      {states.map((row) => (
        <div
          key={row.state}
          className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.8fr_0.7fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.state}</span>
          <span className="text-[9px] font-mono text-cyan-300 text-right">
            {fmtYield(row.avgYield)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtBps(row.spread)}
          </span>
          <div className="flex justify-center">
            <CreditRatingBadge rating={row.creditRating} />
          </div>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            ${fmtAmount(row.outstandingDebt)}
          </span>
          <span
            className={`text-[9px] font-mono font-bold text-right ${
              row.revenueGrowth >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {fmtPct(row.revenueGrowth, true)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CreditRatingBadge({ rating }: { rating: string }) {
  let color = 'text-neutral-400 border-neutral-600';
  if (rating.startsWith('AAA')) color = 'text-green-400 border-green-500/40';
  else if (rating.startsWith('AA')) color = 'text-emerald-400 border-emerald-500/40';
  else if (rating.startsWith('A')) color = 'text-cyan-400 border-cyan-500/40';
  else if (rating.startsWith('BBB')) color = 'text-yellow-400 border-yellow-500/40';
  else if (rating.startsWith('BB')) color = 'text-orange-400 border-orange-500/40';
  else if (rating.startsWith('B')) color = 'text-red-400 border-red-500/40';

  return (
    <span className={`text-[7px] font-mono font-bold px-1 py-px border ${color}`}>
      {rating}
    </span>
  );
}

// ── Sector Data ──

function SectorDataSection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const sectors: Array<{
    sector: string;
    avgYield: number;
    spread: number;
    issuanceYtd: number;
    defaultRate: number;
  }> = data.sectorData ?? data.sectors ?? [];

  if (sectors.length === 0) return null;

  const maxIssuance = Math.max(...sectors.map((s) => s.issuanceYtd), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'mbSectorData', 'Sector Analysis')}
        </span>
      </div>

      <div className="grid grid-cols-[1.4fr_0.7fr_0.6fr_1.2fr_0.6fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'mbSector', 'Sector')}</span>
        <span className="text-right">{tr(t, 'mbAvgYield', 'Avg Yld')}</span>
        <span className="text-right">{tr(t, 'mbSpread', 'Sprd')}</span>
        <span className="text-right">{tr(t, 'mbIssuanceYtd', 'Issuance YTD')}</span>
        <span className="text-right">{tr(t, 'mbDefaultRate', 'Dflt Rt')}</span>
      </div>

      {sectors.map((row) => {
        const barWidth = (row.issuanceYtd / maxIssuance) * 100;
        return (
          <div
            key={row.sector}
            className="grid grid-cols-[1.4fr_0.7fr_0.6fr_1.2fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">
              {row.sector}
            </span>
            <span className="text-[9px] font-mono text-cyan-300 text-right">
              {fmtYield(row.avgYield)}
            </span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {fmtBps(row.spread)}
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <div className="flex-1 h-[6px] bg-border/10 relative max-w-[60px]">
                <div
                  className="absolute inset-y-0 left-0 bg-cyan-400/30"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-[8px] font-mono text-neutral-300 w-10 text-right">
                {fmtAmount(row.issuanceYtd)}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {row.defaultRate.toFixed(2)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Tax-Equivalent Yield Grid ──

function TaxEquivalentGrid({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const grid: Array<{
    bracket: string;
    aaaYield: number;
    aYield: number;
    thirtyYearYield: number;
    bestValue?: string;
  }> = data.taxEquivalentYields ?? data.taxGrid ?? [];

  if (grid.length === 0) return null;

  // Find best value across the grid
  const allValues = grid.flatMap((r) => [r.aaaYield, r.aYield, r.thirtyYearYield]);
  const maxVal = Math.max(...allValues);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'mbTaxEquivalent', 'Tax-Equivalent Yields')}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'mbBracket', 'Tax Bracket')}</span>
        <span className="text-right">AAA</span>
        <span className="text-right">A</span>
        <span className="text-right">30Y</span>
      </div>

      {grid.map((row) => {
        const isAaaBest = row.aaaYield === maxVal;
        const isABest = row.aYield === maxVal;
        const is30Best = row.thirtyYearYield === maxVal;
        const rowBest = row.bestValue;

        return (
          <div
            key={row.bracket}
            className="grid grid-cols-[1fr_0.8fr_0.8fr_0.8fr] px-3 py-1 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors"
          >
            <span className="text-[9px] font-mono font-bold text-white">{row.bracket}</span>
            <span
              className={`text-[9px] font-mono text-right ${
                isAaaBest || rowBest === 'AAA'
                  ? 'text-cyan-400 font-bold'
                  : 'text-neutral-300'
              }`}
            >
              {fmtYield(row.aaaYield)}
            </span>
            <span
              className={`text-[9px] font-mono text-right ${
                isABest || rowBest === 'A'
                  ? 'text-cyan-400 font-bold'
                  : 'text-neutral-300'
              }`}
            >
              {fmtYield(row.aYield)}
            </span>
            <span
              className={`text-[9px] font-mono text-right ${
                is30Best || rowBest === '30Y'
                  ? 'text-cyan-400 font-bold'
                  : 'text-neutral-300'
              }`}
            >
              {fmtYield(row.thirtyYearYield)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── New Issuance ──

function NewIssuanceSection({
  data,
  t,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  t: ReturnType<typeof useT>;
}) {
  const issuances: Array<{
    issuer: string;
    state: string;
    amount: number;
    coupon: number;
    maturity: string;
    rating: string;
    type: string;
    underwriter: string;
  }> = data.newIssuance ?? data.issuance ?? [];

  if (issuances.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'mbNewIssuance', 'New Issuance')}
        </span>
      </div>

      <div className="grid grid-cols-[1.4fr_0.5fr_0.6fr_0.5fr_0.6fr_0.5fr_0.5fr_1fr] px-3 py-1 border-b border-border/10 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>{tr(t, 'mbIssuer', 'Issuer')}</span>
        <span>{tr(t, 'mbState', 'ST')}</span>
        <span className="text-right">{tr(t, 'mbAmount', 'Amt')}</span>
        <span className="text-right">{tr(t, 'mbCoupon', 'Cpn')}</span>
        <span className="text-right">{tr(t, 'mbMaturity', 'Mat')}</span>
        <span className="text-center">{tr(t, 'mbRating', 'Rtg')}</span>
        <span className="text-center">{tr(t, 'mbType', 'Type')}</span>
        <span className="truncate">{tr(t, 'mbUnderwriter', 'Underwriter')}</span>
      </div>

      {issuances.map((row, i) => (
        <div
          key={`${row.issuer}-${i}`}
          className="grid grid-cols-[1.4fr_0.5fr_0.6fr_0.5fr_0.6fr_0.5fr_0.5fr_1fr] px-3 py-1.5 border-b border-border/10 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate" title={row.issuer}>
            {row.issuer}
          </span>
          <span className="text-[8px] font-mono text-neutral-400">{row.state}</span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            ${fmtAmount(row.amount)}
          </span>
          <span className="text-[9px] font-mono text-cyan-300 text-right">
            {row.coupon.toFixed(2)}%
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{row.maturity}</span>
          <div className="flex justify-center">
            <CreditRatingBadge rating={row.rating} />
          </div>
          <div className="flex justify-center">
            <TypeBadge type={row.type} />
          </div>
          <span className="text-[8px] font-mono text-neutral-500 truncate" title={row.underwriter}>
            {row.underwriter}
          </span>
        </div>
      ))}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const isGO = type.toUpperCase() === 'GO' || type.toUpperCase() === 'GENERAL OBLIGATION';
  return (
    <span
      className={`text-[7px] font-mono font-bold px-1 py-px border ${
        isGO
          ? 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
          : 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      }`}
    >
      {isGO ? 'GO' : 'REV'}
    </span>
  );
}
