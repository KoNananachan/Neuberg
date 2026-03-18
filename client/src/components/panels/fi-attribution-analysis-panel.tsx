import { useMemo } from 'react';
import { useFiAttributionAnalysis } from '../../api/hooks/use-fi-attribution-analysis';
import { useT } from '../../i18n';

type TFn = ReturnType<typeof useT>;
const tr = (_t: TFn, _key: string, fallback: string): string => {
  try { return (_t as (k: string) => string)(_key) || fallback; } catch { return fallback; }
};

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(decimals);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

// ── Color helpers ──

function valColor(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function valClass(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Types ──

interface AttributionComponent {
  value: number;
  benchmark: number;
}

interface SectorRow {
  name: string;
  weight: number;
  return: number;
  benchmarkReturn: number;
  excessReturn: number;
  contribution: number;
  duration: number;
  spread: number;
  rating: string;
}

interface ContributorRow {
  isin: string;
  issuer: string;
  coupon: number;
  maturity: string;
  sector: string;
  contribution: number;
  totalReturn: number;
  weight: number;
}

// ── Main Panel ──

export function FiAttributionAnalysisPanel() {
  const t = useT();
  const { data, isLoading, error } = useFiAttributionAnalysis();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-cyan-400 uppercase tracking-widest animate-pulse">
          LOADING...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'error.loadFailed', 'Failed to load attribution analysis data')}
        </span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-cyan-400/30 shrink-0">
        <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-wider">
          {tr(t, 'fiaTitle', 'Fixed Income Attribution Analysis')}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Portfolio Summary Bar */}
        {data.portfolio && <PortfolioSummaryBar portfolio={data.portfolio} />}

        {/* Attribution Decomposition */}
        {data.attribution && <AttributionDecomposition attribution={data.attribution} />}

        {/* Sector Breakdown */}
        {data.sectors && data.sectors.length > 0 && (
          <SectorBreakdownTable sectors={data.sectors} />
        )}

        {/* Top / Bottom Contributors */}
        {data.topContributors && data.topContributors.length > 0 && (
          <ContributorsList contributors={data.topContributors} />
        )}

        {/* Summary Footer */}
        {data.summary && <SummaryFooter summary={data.summary} />}
      </div>
    </div>
  );
}

// ── Portfolio Summary Bar ──

function PortfolioSummaryBar({ portfolio }: {
  portfolio: {
    totalReturn: number;
    benchmarkReturn: number;
    excessReturn: number;
    duration: number;
    modifiedDuration: number;
    convexity: number;
    yield: number;
    spread: number;
    numPositions: number;
  };
}) {
  const t = useT();
  const items = [
    { label: tr(t, 'fiaTotalReturn', 'Total Return'), value: fmtPct(portfolio.totalReturn), color: valColor(portfolio.totalReturn) },
    { label: tr(t, 'fiaBenchmark', 'Benchmark'), value: fmtPct(portfolio.benchmarkReturn), color: '#22d3ee' },
    { label: tr(t, 'fiaExcess', 'Excess'), value: fmtPct(portfolio.excessReturn), color: valColor(portfolio.excessReturn) },
    { label: tr(t, 'fiaDuration', 'Duration'), value: fmtNum(portfolio.duration), color: '#a1a1aa' },
    { label: tr(t, 'fiaYield', 'Yield'), value: fmtPct(portfolio.yield), color: '#a1a1aa' },
    { label: tr(t, 'fiaSpread', 'Spread'), value: fmtBps(portfolio.spread), color: '#a1a1aa' },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-cyan-400/5 border-b border-cyan-400/30 shrink-0">
      {items.map(({ label, value, color }) => (
        <div key={label} className="bg-black px-2 py-1.5 flex flex-col items-center">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
            {label}
          </span>
          <span className="text-[10px] font-mono font-black tabular-nums" style={{ color }}>
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Attribution Decomposition (Stacked Bar) ──

function AttributionDecomposition({ attribution }: {
  attribution: {
    income: AttributionComponent;
    treasuryCurve: AttributionComponent;
    creditSpread: AttributionComponent;
    mortgageSpread: AttributionComponent;
    fxEffect: AttributionComponent;
    selection: AttributionComponent;
    residual: AttributionComponent;
  };
}) {
  const t = useT();

  const components = useMemo(() => [
    { key: 'income', label: tr(t, 'fiaIncome', 'Income'), ...attribution.income },
    { key: 'treasuryCurve', label: tr(t, 'fiaCurve', 'Tsy Curve'), ...attribution.treasuryCurve },
    { key: 'creditSpread', label: tr(t, 'fiaCreditSprd', 'Credit Sprd'), ...attribution.creditSpread },
    { key: 'mortgageSpread', label: tr(t, 'fiaMtgSprd', 'Mtg Sprd'), ...attribution.mortgageSpread },
    { key: 'fxEffect', label: tr(t, 'fiaFX', 'FX'), ...attribution.fxEffect },
    { key: 'selection', label: tr(t, 'fiaSelection', 'Selection'), ...attribution.selection },
    { key: 'residual', label: tr(t, 'fiaResidual', 'Residual'), ...attribution.residual },
  ], [attribution, t]);

  const maxAbsVal = useMemo(
    () => Math.max(...components.map(c => Math.abs(c.value)), 0.01),
    [components]
  );

  const BAR_W = 120;

  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fiaDecomposition', 'Attribution Decomposition')}
        </span>
      </div>

      {/* Header row */}
      <div className="grid grid-cols-[100px_1fr_60px_60px_60px] gap-0 px-3 py-1 border-b border-cyan-400/10">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'fiaComponent', 'Component')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'fiaBar', 'Contribution')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'fiaPortfolio', 'Portfolio')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'fiaBmk', 'Benchmark')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'fiaActive', 'Active')}
        </span>
      </div>

      {components.map(comp => {
        const active = comp.value - comp.benchmark;
        const barWidth = (Math.abs(comp.value) / maxAbsVal) * (BAR_W / 2);
        const isPositive = comp.value >= 0;

        return (
          <div
            key={comp.key}
            className="grid grid-cols-[100px_1fr_60px_60px_60px] gap-0 px-3 py-[3px] border-b border-cyan-400/5 hover:bg-cyan-400/[0.02] items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-300 truncate">
              {comp.label}
            </span>

            {/* Stacked bar */}
            <div className="flex justify-center">
              <svg width={BAR_W} height={12} viewBox={`0 0 ${BAR_W} 12`}>
                <line
                  x1={BAR_W / 2} y1={0} x2={BAR_W / 2} y2={12}
                  stroke="rgba(255,255,255,0.1)" strokeWidth={0.5}
                />
                <rect
                  x={isPositive ? BAR_W / 2 : BAR_W / 2 - barWidth}
                  y={2}
                  width={Math.max(barWidth, 0.5)}
                  height={8}
                  fill={isPositive ? '#22c55e' : '#ef4444'}
                  opacity={0.7}
                />
              </svg>
            </div>

            <span className="text-[8px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(comp.value) }}>
              {fmtPct(comp.value)}
            </span>
            <span className="text-[8px] font-mono tabular-nums text-right text-neutral-500">
              {fmtPct(comp.benchmark)}
            </span>
            <span className="text-[8px] font-mono font-bold tabular-nums text-right" style={{ color: valColor(active) }}>
              {fmtPct(active)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Sector Breakdown Table ──

function SectorBreakdownTable({ sectors }: { sectors: SectorRow[] }) {
  const t = useT();

  return (
    <div className="border-b border-cyan-400/30">
      <div className="px-3 py-1 border-b border-cyan-400/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fiaSectorBreakdown', 'Sector Breakdown')}
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-cyan-400/10">
          <tr>
            <th className="px-2 py-1 text-left font-bold">
              {tr(t, 'fiaSector', 'Sector')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaWt', 'Wt %')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaReturn', 'Return')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaBmkRet', 'Bmk Ret')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaExcessRet', 'Excess')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaContrib', 'Contrib')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaDur', 'Dur')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaSprd', 'Sprd')}
            </th>
            <th className="px-2 py-1 text-right font-bold">
              {tr(t, 'fiaRating', 'Rating')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sectors.map((s, i) => (
            <tr key={i} className="border-b border-cyan-400/5 hover:bg-cyan-400/[0.02]">
              <td className="px-2 py-1 text-left font-bold text-white">{s.name}</td>
              <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(s.weight, 1)}</td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valColor(s.return) }}>
                {fmtPct(s.return)}
              </td>
              <td className="px-2 py-1 text-right text-neutral-500">
                {fmtPct(s.benchmarkReturn)}
              </td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valColor(s.excessReturn) }}>
                {fmtPct(s.excessReturn)}
              </td>
              <td className="px-2 py-1 text-right font-bold" style={{ color: valColor(s.contribution) }}>
                {fmtPct(s.contribution)}
              </td>
              <td className="px-2 py-1 text-right text-neutral-400">{fmtNum(s.duration, 1)}</td>
              <td className="px-2 py-1 text-right text-neutral-400">{fmtBps(s.spread)}</td>
              <td className="px-2 py-1 text-right text-neutral-300">{s.rating}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Top / Bottom Contributors ──

function ContributorsList({ contributors }: { contributors: ContributorRow[] }) {
  const t = useT();

  const sorted = useMemo(
    () => [...contributors].sort((a, b) => b.contribution - a.contribution),
    [contributors]
  );

  const topN = sorted.slice(0, 5);
  const bottomN = sorted.slice(-5).reverse();

  return (
    <div className="border-b border-cyan-400/30">
      {/* Top Contributors */}
      <div className="px-3 py-1 border-b border-cyan-400/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-green-500">
          {tr(t, 'fiaTopContributors', 'Top Contributors')}
        </span>
      </div>
      <ContributorTable rows={topN} />

      {/* Bottom Contributors */}
      <div className="px-3 py-1 border-b border-cyan-400/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-red-500">
          {tr(t, 'fiaBottomContributors', 'Bottom Contributors')}
        </span>
      </div>
      <ContributorTable rows={bottomN} />
    </div>
  );
}

function ContributorTable({ rows }: { rows: ContributorRow[] }) {
  const t = useT();

  return (
    <table className="w-full text-[9px] font-mono">
      <thead className="bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-cyan-400/10">
        <tr>
          <th className="px-2 py-1 text-left font-bold">{tr(t, 'fiaIssuer', 'Issuer')}</th>
          <th className="px-2 py-1 text-right font-bold">{tr(t, 'fiaCoupon', 'Cpn')}</th>
          <th className="px-2 py-1 text-right font-bold">{tr(t, 'fiaMaturity', 'Maturity')}</th>
          <th className="px-2 py-1 text-left font-bold">{tr(t, 'fiaSec', 'Sector')}</th>
          <th className="px-2 py-1 text-right font-bold">{tr(t, 'fiaWt2', 'Wt %')}</th>
          <th className="px-2 py-1 text-right font-bold">{tr(t, 'fiaTotRet', 'Tot Ret')}</th>
          <th className="px-2 py-1 text-right font-bold">{tr(t, 'fiaContrib2', 'Contrib')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-cyan-400/5 hover:bg-cyan-400/[0.02]">
            <td className="px-2 py-1 text-left text-white font-bold truncate max-w-[120px]">
              {r.issuer}
            </td>
            <td className="px-2 py-1 text-right text-neutral-300">{fmtNum(r.coupon, 3)}</td>
            <td className="px-2 py-1 text-right text-neutral-400">{r.maturity}</td>
            <td className="px-2 py-1 text-left text-neutral-500 truncate max-w-[80px]">{r.sector}</td>
            <td className="px-2 py-1 text-right text-neutral-300">{fmtPct(r.weight, 1)}</td>
            <td className="px-2 py-1 text-right font-bold" style={{ color: valColor(r.totalReturn) }}>
              {fmtPct(r.totalReturn)}
            </td>
            <td className={`px-2 py-1 text-right font-black ${valClass(r.contribution)}`}>
              {fmtPct(r.contribution, 3)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Summary Footer ──

function SummaryFooter({ summary }: {
  summary: {
    totalExcess: number;
    biggestContributor: string;
    biggestDetractor: string;
    durationBet: number;
    spreadDuration: number;
  };
}) {
  const t = useT();

  return (
    <div className="px-3 py-2 bg-[#030303] border-t border-cyan-400/20">
      <div className="grid grid-cols-5 gap-3">
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fiaTotalExcess', 'Total Excess')}
          </span>
          <span className={`text-[10px] font-mono font-black tabular-nums ${valClass(summary.totalExcess)}`}>
            {fmtPct(summary.totalExcess)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fiaBiggestPlus', 'Biggest +')}
          </span>
          <span className="text-[9px] font-mono font-bold text-green-400 truncate">
            {summary.biggestContributor}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fiaBiggestMinus', 'Biggest -')}
          </span>
          <span className="text-[9px] font-mono font-bold text-red-400 truncate">
            {summary.biggestDetractor}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fiaDurationBet', 'Duration Bet')}
          </span>
          <span className="text-[10px] font-mono font-black tabular-nums" style={{ color: valColor(summary.durationBet) }}>
            {fmtNum(summary.durationBet)} yr
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fiaSpreadDur', 'Spread Dur')}
          </span>
          <span className="text-[10px] font-mono font-black tabular-nums text-neutral-300">
            {fmtNum(summary.spreadDuration)}
          </span>
        </div>
      </div>
    </div>
  );
}
