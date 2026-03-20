import { useStructuredProductsAnalyzer } from '../../api/hooks/use-structured-products-analyzer';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Layers, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// -- i18n fallback helper --

// -- Formatting helpers --

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(0)}bp`;
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(3);
}

function fmtWal(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}y`;
}

function fmtSize(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  if (Math.abs(n) >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toLocaleString()}`;
}

// -- Color helpers --

function ratingColor(rating: string | null | undefined): string {
  const r = (rating ?? '').toUpperCase();
  if (r.startsWith('AAA')) return 'text-green-400';
  if (r.startsWith('AA')) return 'text-emerald-400';
  if (r.startsWith('A')) return 'text-cyan-400';
  if (r.startsWith('BBB')) return 'text-blue-400';
  if (r.startsWith('BB')) return 'text-amber-400';
  if (r.startsWith('B')) return 'text-orange-400';
  return 'text-neutral-400';
}

function spreadColor(bps: number | null | undefined): string {
  if (bps == null) return 'text-neutral-500';
  if (bps <= 80) return 'text-green-400';
  if (bps <= 200) return 'text-fuchsia-300';
  if (bps <= 400) return 'text-amber-400';
  if (bps <= 700) return 'text-orange-400';
  return 'text-red-400';
}

function delinquencyColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 10) return 'text-red-400';
  if (n >= 5) return 'text-orange-400';
  if (n >= 2) return 'text-yellow-400';
  return 'text-green-400';
}

function recoveryColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n >= 70) return 'text-green-400';
  if (n >= 50) return 'text-yellow-400';
  if (n >= 30) return 'text-orange-400';
  return 'text-red-400';
}

function trendArrow(trend: string | null | undefined) {
  const s = (trend ?? '').toLowerCase();
  if (s === 'up' || s === 'increasing' || s === 'rising')
    return <TrendingUp className="w-2.5 h-2.5 text-red-400 inline-block" />;
  if (s === 'down' || s === 'decreasing' || s === 'falling')
    return <TrendingDown className="w-2.5 h-2.5 text-green-400 inline-block" />;
  return <Minus className="w-2.5 h-2.5 text-neutral-500 inline-block" />;
}

// -- Tranche bar fill colors --

const TRANCHE_FILLS: Record<string, string> = {
  AAA: '#4ade80',
  AA: '#34d399',
  A: '#22d3ee',
  BBB: '#60a5fa',
  BB: '#fbbf24',
  B: '#fb923c',
  EQUITY: '#f87171',
  EQ: '#f87171',
  MEZZANINE: '#c084fc',
  MEZZ: '#c084fc',
  RESIDUAL: '#f87171',
};

function trancheFill(name: string): string {
  return TRANCHE_FILLS[name.toUpperCase()] ?? '#a78bfa';
}

// -- Rating colors for spread curve SVG --

const RATING_LINE_COLORS: Record<string, string> = {
  AAA: '#4ade80',
  AA: '#34d399',
  A: '#22d3ee',
  BBB: '#60a5fa',
  BB: '#fbbf24',
  B: '#fb923c',
};

// -- Static mock data --

const PRODUCT_UNIVERSE = [
  { type: 'CLO', tranche: 'AAA', rating: 'AAA', spread: 118, wal: 4.2, oas: 125, price: 100.125 },
  { type: 'CLO', tranche: 'AA', rating: 'AA', spread: 175, wal: 5.1, oas: 182, price: 99.875 },
  { type: 'CLO', tranche: 'A', rating: 'A', spread: 228, wal: 5.8, oas: 240, price: 99.250 },
  { type: 'CLO', tranche: 'BBB', rating: 'BBB', spread: 345, wal: 6.2, oas: 365, price: 97.500 },
  { type: 'CLO', tranche: 'BB', rating: 'BB', spread: 525, wal: 6.8, oas: 560, price: 94.750 },
  { type: 'RMBS', tranche: 'Senior', rating: 'AAA', spread: 68, wal: 3.5, oas: 72, price: 101.234 },
  { type: 'RMBS', tranche: 'Mezz', rating: 'A', spread: 185, wal: 4.8, oas: 195, price: 98.625 },
  { type: 'CMBS', tranche: 'A4', rating: 'AAA', spread: 108, wal: 4.5, oas: 115, price: 100.375 },
  { type: 'CMBS', tranche: 'AS', rating: 'AA-', spread: 142, wal: 5.2, oas: 150, price: 99.750 },
  { type: 'CMBS', tranche: 'B', rating: 'A-', spread: 218, wal: 5.8, oas: 232, price: 98.125 },
  { type: 'ABS Auto', tranche: 'A', rating: 'AAA', spread: 42, wal: 1.8, oas: 45, price: 100.875 },
  { type: 'ABS Card', tranche: 'A', rating: 'AAA', spread: 38, wal: 2.2, oas: 40, price: 101.062 },
];

const PREPAYMENT_METRICS = [
  { label: 'CPR (1M)', value: 8.4, prev: 7.9, trend: 'up' },
  { label: 'CPR (3M)', value: 7.8, prev: 7.5, trend: 'up' },
  { label: 'CPR (6M)', value: 7.2, prev: 7.4, trend: 'down' },
  { label: 'CPR (LIFE)', value: 6.8, prev: 6.8, trend: 'stable' },
  { label: 'PSA', value: 142, prev: 138, trend: 'up' },
  { label: 'SMM (1M)', value: 0.73, prev: 0.68, trend: 'up' },
  { label: 'SMM (3M)', value: 0.67, prev: 0.65, trend: 'up' },
  { label: 'SMM (LIFE)', value: 0.59, prev: 0.59, trend: 'stable' },
];

const TRANCHE_WATERFALL = [
  { name: 'AAA', pct: 62, subordination: 38.0 },
  { name: 'AA', pct: 12, subordination: 26.0 },
  { name: 'A', pct: 8, subordination: 18.0 },
  { name: 'BBB', pct: 6, subordination: 12.0 },
  { name: 'BB', pct: 4, subordination: 8.0 },
  { name: 'Equity', pct: 8, subordination: 0.0 },
];

const CREDIT_ENHANCEMENT = [
  { type: 'CLO', aaa: 38.0, aa: 26.0, a: 18.0, bbb: 12.0, bb: 8.0 },
  { type: 'RMBS Agency', aaa: 100, aa: null, a: null, bbb: null, bb: null },
  { type: 'RMBS Non-Agency', aaa: 28.5, aa: 18.2, a: 12.4, bbb: 7.8, bb: 4.2 },
  { type: 'CMBS Conduit', aaa: 30.0, aa: 20.5, a: 14.0, bbb: 8.5, bb: 5.0 },
  { type: 'ABS Auto', aaa: 22.0, aa: 14.5, a: 9.0, bbb: 5.5, bb: null },
  { type: 'ABS Card', aaa: 18.0, aa: 12.0, a: 7.5, bbb: 4.0, bb: null },
];

const COLLATERAL_PERFORMANCE = [
  { sector: 'Prime RMBS', delinquency30: 1.12, delinquency60: 0.45, delinquency90: 0.28, defaultRate: 0.42, recovery: 72.5 },
  { sector: 'Subprime RMBS', delinquency30: 4.82, delinquency60: 2.15, delinquency90: 1.68, defaultRate: 2.85, recovery: 58.2 },
  { sector: 'CMBS Office', delinquency30: 6.15, delinquency60: 3.42, delinquency90: 2.85, defaultRate: 3.95, recovery: 45.8 },
  { sector: 'CMBS Multifamily', delinquency30: 1.08, delinquency60: 0.52, delinquency90: 0.35, defaultRate: 0.68, recovery: 75.2 },
  { sector: 'CLO Leveraged', delinquency30: 2.35, delinquency60: 1.12, delinquency90: 0.85, defaultRate: 1.52, recovery: 68.4 },
  { sector: 'Auto ABS', delinquency30: 2.48, delinquency60: 0.95, delinquency90: 0.58, defaultRate: 1.82, recovery: 52.1 },
  { sector: 'Card ABS', delinquency30: 1.95, delinquency60: 0.82, delinquency90: 0.55, defaultRate: 3.15, recovery: 15.8 },
];

const ISSUANCE_PIPELINE = [
  { deal: 'ARES CLO 2025-3', type: 'CLO', size: 600e6, status: 'MARKETING', spread: 118, date: '2025-03-21' },
  { deal: 'FNMA 2025-TBA', type: 'RMBS', size: 2.5e9, status: 'PRICED', spread: 68, date: '2025-03-18' },
  { deal: 'BANK 2025-BNK51', type: 'CMBS', size: 1.1e9, status: 'LAUNCHED', spread: 112, date: '2025-03-20' },
  { deal: 'AMCAR 2025-2', type: 'ABS Auto', size: 1.8e9, status: 'PRICED', spread: 40, date: '2025-03-17' },
  { deal: 'CITICC 2025-B1', type: 'ABS Card', size: 2.2e9, status: 'MARKETING', spread: 36, date: '2025-03-22' },
  { deal: 'KKR CLO 44', type: 'CLO', size: 500e6, status: 'ROADSHOW', spread: 125, date: '2025-03-24' },
];

const SPREAD_CURVES = [
  { rating: 'AAA', tenors: [{ t: 1, s: 32 }, { t: 2, s: 48 }, { t: 3, s: 68 }, { t: 5, s: 95 }, { t: 7, s: 112 }, { t: 10, s: 128 }] },
  { rating: 'AA', tenors: [{ t: 1, s: 55 }, { t: 2, s: 78 }, { t: 3, s: 108 }, { t: 5, s: 148 }, { t: 7, s: 172 }, { t: 10, s: 195 }] },
  { rating: 'A', tenors: [{ t: 1, s: 82 }, { t: 2, s: 115 }, { t: 3, s: 155 }, { t: 5, s: 205 }, { t: 7, s: 238 }, { t: 10, s: 265 }] },
  { rating: 'BBB', tenors: [{ t: 1, s: 125 }, { t: 2, s: 175 }, { t: 3, s: 225 }, { t: 5, s: 305 }, { t: 7, s: 355 }, { t: 10, s: 395 }] },
  { rating: 'BB', tenors: [{ t: 1, s: 210 }, { t: 2, s: 285 }, { t: 3, s: 365 }, { t: 5, s: 465 }, { t: 7, s: 525 }, { t: 10, s: 575 }] },
];

// -- Main Panel --

export function StructuredProductsAnalyzerPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useStructuredProductsAnalyzer();
  const d = data as Record<string, unknown> | null;

  const products = (d?.productUniverse as typeof PRODUCT_UNIVERSE) ?? PRODUCT_UNIVERSE;
  const prepay = (d?.prepaymentMetrics as typeof PREPAYMENT_METRICS) ?? PREPAYMENT_METRICS;
  const waterfall = (d?.trancheWaterfall as typeof TRANCHE_WATERFALL) ?? TRANCHE_WATERFALL;
  const enhancement = (d?.creditEnhancement as typeof CREDIT_ENHANCEMENT) ?? CREDIT_ENHANCEMENT;
  const collateral = (d?.collateralPerformance as typeof COLLATERAL_PERFORMANCE) ?? COLLATERAL_PERFORMANCE;
  const pipeline = (d?.issuancePipeline as typeof ISSUANCE_PIPELINE) ?? ISSUANCE_PIPELINE;
  const curves = (d?.spreadCurves as typeof SPREAD_CURVES) ?? SPREAD_CURVES;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-fuchsia-400">
            {tr(t, 'spaTitle', 'Structured Products Analyzer')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-fuchsia-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-fuchsia-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!isLoading && !d && products.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            NO DATA AVAILABLE
          </div>
        )}

        <ProductUniverseSection products={products} t={t} />
        <PrepaymentMetricsSection metrics={prepay} t={t} />
        <TrancheWaterfallSection waterfall={waterfall} t={t} />
        <CreditEnhancementSection enhancement={enhancement} t={t} />
        <CollateralPerformanceSection collateral={collateral} t={t} />
        <IssuancePipelineSection pipeline={pipeline} t={t} />
        <SpreadCurveSection curves={curves} t={t} />
      </div>
    </div>
  );
}

// -- Section 1: Product Universe Table --

function ProductUniverseSection({
  products,
  t,
}: {
  products: typeof PRODUCT_UNIVERSE;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaProductUniverse', 'Product Universe')}
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[580px]">
          <thead>
            <tr className="border-b border-border/20 bg-[#050505]">
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TYPE</th>
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TRANCHE</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">RATING</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">WAL</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">OAS</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">PRICE</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr
                key={`${p.type}-${p.tranche}-${i}`}
                className="border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-fuchsia-400">{p.type}</td>
                <td className="px-2 py-1 text-[9px] font-mono text-white">{p.tranche}</td>
                <td className={`px-2 py-1 text-[9px] font-mono font-bold text-right ${ratingColor(p.rating)}`}>
                  {p.rating}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${spreadColor(p.spread)}`}>
                  {fmtBps(p.spread)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-300">
                  {fmtWal(p.wal)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${spreadColor(p.oas)}`}>
                  {fmtBps(p.oas)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">
                  {fmtPrice(p.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Section 2: Prepayment Metrics --

function PrepaymentMetricsSection({
  metrics,
  t,
}: {
  metrics: typeof PREPAYMENT_METRICS;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaPrepayment', 'Prepayment Metrics')}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-px bg-border/10">
        {metrics.map((m) => {
          const delta = m.value - m.prev;
          const deltaStr = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2);
          return (
            <div
              key={m.label}
              className="bg-black px-2.5 py-2 hover:bg-fuchsia-400/[0.02] transition-colors"
            >
              <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500 mb-0.5">
                {m.label}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-mono font-bold text-white">
                  {m.value < 1 ? m.value.toFixed(2) : m.value.toFixed(1)}
                </span>
                <span className="flex items-center gap-0.5">
                  {trendArrow(m.trend)}
                  <span className={`text-[7px] font-mono font-bold ${
                    delta > 0 ? 'text-red-400' : delta < 0 ? 'text-green-400' : 'text-neutral-500'
                  }`}>
                    {deltaStr}
                  </span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Section 3: Tranche Waterfall (SVG stacked bars) --

function TrancheWaterfallSection({
  waterfall,
  t,
}: {
  waterfall: typeof TRANCHE_WATERFALL;
  t: TFn;
}) {
  const chartW = 400;
  const chartH = 140;
  const barW = 44;
  const gap = 10;
  const totalW = waterfall.length * (barW + gap) - gap;
  const offsetX = (chartW - totalW) / 2;
  const topPad = 16;
  const bottomPad = 20;
  const barMaxH = chartH - topPad - bottomPad;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaTrancheWaterfall', 'Tranche Waterfall - Subordination Structure')}
        </span>
      </div>

      <div className="px-3 py-2 flex justify-center">
        <svg
          width="100%"
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="max-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {waterfall.map((tr_, i) => {
            const x = offsetX + i * (barW + gap);
            const barH = (tr_.pct / 100) * barMaxH;
            const y = chartH - bottomPad - barH;
            const fill = trancheFill(tr_.name);

            return (
              <g key={tr_.name}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill={fill}
                  opacity={0.7}
                />
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={1}
                  fill={fill}
                  opacity={1}
                />
                {/* Pct label */}
                <text
                  x={x + barW / 2}
                  y={y + barH / 2 + 3}
                  textAnchor="middle"
                  fill="white"
                  fontSize="7"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {tr_.pct}%
                </text>
                {/* Tranche name */}
                <text
                  x={x + barW / 2}
                  y={chartH - 6}
                  textAnchor="middle"
                  fill="#a3a3a3"
                  fontSize="6.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {tr_.name.toUpperCase()}
                </text>
                {/* Subordination label on top */}
                <text
                  x={x + barW / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fill={fill}
                  fontSize="6"
                  fontFamily="monospace"
                >
                  {tr_.subordination.toFixed(1)}%
                </text>
              </g>
            );
          })}
          {/* Y-axis label */}
          <text
            x={offsetX - 8}
            y={topPad + barMaxH / 2}
            textAnchor="middle"
            fill="#525252"
            fontSize="5.5"
            fontFamily="monospace"
            transform={`rotate(-90, ${offsetX - 8}, ${topPad + barMaxH / 2})`}
          >
            SUBORDINATION
          </text>
        </svg>
      </div>
    </div>
  );
}

// -- Section 4: Credit Enhancement Levels --

function CreditEnhancementSection({
  enhancement,
  t,
}: {
  enhancement: typeof CREDIT_ENHANCEMENT;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaCreditEnhancement', 'Credit Enhancement Levels by Product Type')}
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[480px]">
          <thead>
            <tr className="border-b border-border/20 bg-[#050505]">
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
                PRODUCT TYPE
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-green-400/60">
                AAA
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-emerald-400/60">
                AA
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-cyan-400/60">
                A
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-blue-400/60">
                BBB
              </th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-amber-400/60">
                BB
              </th>
            </tr>
          </thead>
          <tbody>
            {enhancement.map((row) => (
              <tr
                key={row.type}
                className="border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-fuchsia-400">
                  {row.type}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-green-400">
                  {row.aaa != null ? fmtPct(row.aaa, 1) : '-'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-emerald-400">
                  {row.aa != null ? fmtPct(row.aa, 1) : '-'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-cyan-400">
                  {row.a != null ? fmtPct(row.a, 1) : '-'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-blue-400">
                  {row.bbb != null ? fmtPct(row.bbb, 1) : '-'}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-amber-400">
                  {row.bb != null ? fmtPct(row.bb, 1) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Section 5: Collateral Performance Metrics --

function CollateralPerformanceSection({
  collateral,
  t,
}: {
  collateral: typeof COLLATERAL_PERFORMANCE;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaCollateralPerformance', 'Collateral Performance Metrics')}
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[580px]">
          <thead>
            <tr className="border-b border-border/20 bg-[#050505]">
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SECTOR</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">30D DQ</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">60D DQ</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">90D DQ</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">DEFAULT</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">RECOVERY</th>
            </tr>
          </thead>
          <tbody>
            {collateral.map((row) => (
              <tr
                key={row.sector}
                className="border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-white">{row.sector}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(row.delinquency30)}`}>
                  {fmtPct(row.delinquency30)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${delinquencyColor(row.delinquency60)}`}>
                  {fmtPct(row.delinquency60)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${delinquencyColor(row.delinquency90)}`}>
                  {fmtPct(row.delinquency90)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right font-bold ${delinquencyColor(row.defaultRate)}`}>
                  {fmtPct(row.defaultRate)}
                </td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${recoveryColor(row.recovery)}`}>
                  {fmtPct(row.recovery, 1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// -- Section 6: Issuance Pipeline Summary --

function IssuancePipelineSection({
  pipeline,
  t,
}: {
  pipeline: typeof ISSUANCE_PIPELINE;
  t: TFn;
}) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaIssuancePipeline', 'Issuance Pipeline')}
        </span>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="border-b border-border/20 bg-[#050505]">
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">DEAL</th>
              <th className="px-2 py-1 text-left text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">TYPE</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SIZE</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">SPREAD</th>
              <th className="px-2 py-1 text-right text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">DATE</th>
              <th className="px-2 py-1 text-center text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {pipeline.map((deal, i) => (
              <tr
                key={`${deal.deal}-${i}`}
                className="border-b border-border/5 hover:bg-fuchsia-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-[9px] font-mono font-bold text-fuchsia-400">{deal.deal}</td>
                <td className="px-2 py-1">
                  <span className="px-1 py-px text-[7px] font-mono font-bold uppercase border bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300">
                    {deal.type}
                  </span>
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-white">{fmtSize(deal.size)}</td>
                <td className={`px-2 py-1 text-[9px] font-mono text-right ${spreadColor(deal.spread)}`}>
                  +{fmtBps(deal.spread)}
                </td>
                <td className="px-2 py-1 text-[9px] font-mono text-right text-neutral-400">{deal.date}</td>
                <td className="px-2 py-1 text-center">
                  <span className={`px-1.5 py-px text-[7px] font-mono font-bold uppercase border ${statusStyle(deal.status)}`}>
                    {deal.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pipeline summary */}
      <div className="px-3 py-1.5 border-t border-border/10 bg-fuchsia-400/[0.02]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[7px] font-mono text-neutral-600 uppercase">TOTAL DEALS</span>
            <span className="text-[9px] font-mono font-bold text-white ml-1.5">{pipeline.length}</span>
          </div>
          <div>
            <span className="text-[7px] font-mono text-neutral-600 uppercase">TOTAL VOLUME</span>
            <span className="text-[9px] font-mono font-bold text-fuchsia-400 ml-1.5">
              {fmtSize(pipeline.reduce((sum, d) => sum + (d.size ?? 0), 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function statusStyle(status: string): string {
  const s = (status ?? '').toUpperCase();
  if (s === 'PRICED' || s === 'CLOSED')
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  if (s === 'MARKETING' || s === 'ROADSHOW')
    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (s === 'LAUNCHED')
    return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
  return 'text-neutral-400 bg-neutral-500/10 border-neutral-500/30';
}

// -- Section 7: Spread Curves by Rating (SVG line chart) --

function SpreadCurveSection({
  curves,
  t,
}: {
  curves: typeof SPREAD_CURVES;
  t: TFn;
}) {
  const chartW = 400;
  const chartH = 160;
  const padL = 38;
  const padR = 14;
  const padT = 14;
  const padB = 24;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  // All tenors from data
  const allTenors = [1, 2, 3, 5, 7, 10];
  const maxTenor = 10;
  const minTenor = 1;

  // Find max spread
  let maxSpread = 0;
  for (const curve of curves) {
    for (const pt of curve.tenors) {
      if (pt.s > maxSpread) maxSpread = pt.s;
    }
  }
  maxSpread = Math.ceil(maxSpread / 100) * 100;

  const xScale = (tenor: number) => padL + ((tenor - minTenor) / (maxTenor - minTenor)) * plotW;
  const yScale = (spread: number) => padT + plotH - (spread / maxSpread) * plotH;

  // Gridlines
  const yGridCount = 5;
  const yGridStep = maxSpread / yGridCount;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'spaSpreadCurves', 'Spread Curves by Rating')}
        </span>
      </div>

      <div className="px-3 py-2 flex justify-center">
        <svg
          width="100%"
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="max-w-[400px]"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Grid lines */}
          {Array.from({ length: yGridCount + 1 }, (_, i) => {
            const val = i * yGridStep;
            const y = yScale(val);
            return (
              <g key={`grid-${i}`}>
                <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#262626" strokeWidth={0.5} />
                <text x={padL - 4} y={y + 3} textAnchor="end" fill="#525252" fontSize="5.5" fontFamily="monospace">
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {allTenors.map((tenor) => (
            <text
              key={`x-${tenor}`}
              x={xScale(tenor)}
              y={chartH - 6}
              textAnchor="middle"
              fill="#525252"
              fontSize="5.5"
              fontFamily="monospace"
            >
              {tenor}Y
            </text>
          ))}

          {/* Axis label */}
          <text
            x={padL - 6}
            y={padT + plotH / 2}
            textAnchor="middle"
            fill="#525252"
            fontSize="5"
            fontFamily="monospace"
            transform={`rotate(-90, ${padL - 6}, ${padT + plotH / 2})`}
          >
            SPREAD (BP)
          </text>

          {/* Curves */}
          {curves.map((curve) => {
            const color = RATING_LINE_COLORS[curve.rating] ?? '#a78bfa';
            const points = curve.tenors.map(
              (pt) => `${xScale(pt.t)},${yScale(pt.s)}`
            );
            const pathD = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`)
              .join(' ');

            return (
              <g key={curve.rating}>
                <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} opacity={0.8} />
                {/* Dots */}
                {curve.tenors.map((pt) => (
                  <circle
                    key={`${curve.rating}-${pt.t}`}
                    cx={xScale(pt.t)}
                    cy={yScale(pt.s)}
                    r={2}
                    fill={color}
                  />
                ))}
                {/* Label at end */}
                <text
                  x={xScale(curve.tenors[curve.tenors.length - 1].t) + 4}
                  y={yScale(curve.tenors[curve.tenors.length - 1].s) + 3}
                  fill={color}
                  fontSize="6"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {curve.rating}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-3 pb-2 flex items-center gap-3 flex-wrap">
        {curves.map((curve) => {
          const color = RATING_LINE_COLORS[curve.rating] ?? '#a78bfa';
          return (
            <div key={curve.rating} className="flex items-center gap-1">
              <div className="w-3 h-[2px]" style={{ backgroundColor: color }} />
              <span className="text-[7px] font-mono font-bold uppercase" style={{ color }}>
                {curve.rating}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
