import { Loader2 } from 'lucide-react';
import { useCrossMargining } from '../../api/hooks/use-cross-margining';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Local types --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SummaryData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PairOffset = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CCPProgram = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ComparisonData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetClassEfficiency = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HistoricalSavings = any;

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
  return n.toFixed(1) + '%';
}

function fmtCorr(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(3);
}

// -- Color helpers --

function savingsColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function corrColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  const abs = Math.abs(n);
  if (abs >= 0.7) return 'text-green-400';
  if (abs >= 0.4) return 'text-yellow-400';
  return 'text-neutral-500';
}

function utilizationBarColor(pct: number | null | undefined): string {
  if (pct == null) return '#71717a';
  if (pct > 80) return '#4ade80';
  if (pct > 50) return '#22c55e';
  return '#166534';
}

// -- Text sparkline (30-day) --

function textSparkline(values: number[] | null | undefined): string {
  if (!values || values.length === 0) return '';
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => blocks[Math.min(Math.floor(((v - min) / range) * 7), 7)]).join('');
}

// -- Main Panel --

export function CrossMarginingPanel() {
  const t = useT();
  const { data, isLoading, error } = useCrossMargining();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-green-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load cross-margining data
        </div>
      </div>
    );
  }

  const summary: SummaryData = data?.summary;
  const pairOffsets: PairOffset[] = data?.pairOffsets ?? [];
  const ccpPrograms: CCPProgram[] = data?.ccpPrograms ?? [];
  const comparison: ComparisonData = data?.comparison;
  const assetClassEfficiency: AssetClassEfficiency[] = data?.assetClassEfficiency ?? [];
  const historicalSavings: HistoricalSavings = data?.historicalSavings;

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-green-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-green-400">
            {tr(t, 'panelCrossMargining', 'Cross-Margining Efficiency')}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">XMRG</span>
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-green-400" />}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Summary */}
        {summary && <SummarySection summary={summary} />}

        {/* Product Pair Offsets */}
        {pairOffsets.length > 0 && <PairOffsetsSection pairs={pairOffsets} />}

        {/* CCP Programs */}
        {ccpPrograms.length > 0 && <CCPProgramsSection programs={ccpPrograms} />}

        {/* Portfolio vs Reg-T Comparison */}
        {comparison && <ComparisonSection data={comparison} />}

        {/* Asset Class Efficiency */}
        {assetClassEfficiency.length > 0 && <AssetClassEfficiencySection items={assetClassEfficiency} />}

        {/* Historical Savings Sparkline */}
        {historicalSavings && <HistoricalSavingsSection data={historicalSavings} />}

      </div>
    </div>
  );
}

// -- 1. Summary Section --

function SummarySection({ summary }: { summary: SummaryData }) {
  const cards = [
    {
      label: 'Total Margin (No Net)',
      value: fmtAmt(summary?.totalMarginGross),
      color: 'text-white/80',
    },
    {
      label: 'Cross-Margin Benefit',
      value: summary?.crossMarginBenefit != null
        ? '-' + fmtAmt(Math.abs(summary.crossMarginBenefit))
        : '-',
      color: 'text-green-400',
    },
    {
      label: 'Net Margin',
      value: fmtAmt(summary?.netMargin),
      color: 'text-white font-black',
    },
    {
      label: 'Savings %',
      value: fmtPct(summary?.savingsPct),
      color: 'text-green-400',
    },
    {
      label: 'Capital Efficiency',
      value: summary?.capitalEfficiency != null
        ? summary.capitalEfficiency.toFixed(2) + 'x'
        : '-',
      color: 'text-green-400',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 border-b border-border/20 shrink-0">
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

// -- 2. Product Pair Offsets Table --

function PairOffsetsSection({ pairs }: { pairs: PairOffset[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider">
          Product Pair Offsets
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Pair</th>
            <th className="px-2 py-1.5 text-right font-bold">Standalone A</th>
            <th className="px-2 py-1.5 text-right font-bold">Standalone B</th>
            <th className="px-2 py-1.5 text-right font-bold">Cross-Margin</th>
            <th className="px-2 py-1.5 text-right font-bold">Offset %</th>
            <th className="px-2 py-1.5 text-right font-bold">Correl</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair: PairOffset, i: number) => (
            <tr
              key={pair?.pair ?? i}
              className="border-b border-border/5 hover:bg-green-400/[0.02] transition-colors"
            >
              <td className="px-2 py-1 text-left text-green-400 font-bold">
                {pair?.pair ?? '-'}
              </td>
              <td className="px-2 py-1 text-right text-white/80 tabular-nums">
                {fmtAmt(pair?.standaloneA)}
              </td>
              <td className="px-2 py-1 text-right text-white/80 tabular-nums">
                {fmtAmt(pair?.standaloneB)}
              </td>
              <td className="px-2 py-1 text-right text-white font-bold tabular-nums">
                {fmtAmt(pair?.crossMargin)}
              </td>
              <td className={`px-2 py-1 text-right font-bold tabular-nums ${savingsColor(pair?.offsetPct)}`}>
                {fmtPct(pair?.offsetPct)}
              </td>
              <td className={`px-2 py-1 text-right tabular-nums ${corrColor(pair?.correlation)}`}>
                {fmtCorr(pair?.correlation)}
              </td>
            </tr>
          ))}
          {pairs.length === 0 && (
            <tr>
              <td colSpan={6} className="px-2 py-3 text-center text-neutral-600 uppercase tracking-wider">
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// -- 3. CCP Programs --

function CCPProgramsSection({ programs }: { programs: CCPProgram[] }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider">
          CCP Programs
        </span>
      </div>
      <div className="grid grid-cols-2 gap-0">
        {programs.map((prog: CCPProgram, i: number) => (
          <div
            key={prog?.name ?? i}
            className="px-2 py-2 border-r border-b border-border/20 even:border-r-0 hover:bg-green-400/[0.02] transition-colors"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider truncate">
                {prog?.name ?? '-'}
              </span>
              <span className="text-[7px] font-mono text-neutral-500 uppercase">
                {prog?.status ?? '-'}
              </span>
            </div>

            {/* Utilization bar */}
            <div className="mb-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">
                  Utilization
                </span>
                <span className="text-[8px] font-mono font-bold text-white/80 tabular-nums">
                  {fmtPct(prog?.utilization)}
                </span>
              </div>
              <div className="h-[3px] w-full bg-neutral-900 relative">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${Math.min(Math.max(prog?.utilization ?? 0, 0), 100)}%`,
                    backgroundColor: utilizationBarColor(prog?.utilization),
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">Eligible</div>
                <div className="text-[8px] font-mono text-white/70 tabular-nums">
                  {fmtAmt(prog?.eligible)}
                </div>
              </div>
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">Benefit</div>
                <div className="text-[8px] font-mono text-green-400 font-bold tabular-nums">
                  {fmtAmt(prog?.benefit)}
                </div>
              </div>
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">Products</div>
                <div className="text-[8px] font-mono text-white/70 tabular-nums">
                  {prog?.productCount ?? '-'}
                </div>
              </div>
              <div>
                <div className="text-[6px] font-mono text-neutral-600 uppercase">Offset Rate</div>
                <div className="text-[8px] font-mono text-white/70 tabular-nums">
                  {fmtPct(prog?.offsetRate)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// -- 4. Portfolio vs Reg-T Comparison --

function ComparisonSection({ data }: { data: ComparisonData }) {
  const portfolio = data?.portfolio;
  const regT = data?.regT;

  if (!portfolio && !regT) return null;

  const rows = [
    { label: 'Initial Margin', pVal: portfolio?.initialMargin, rVal: regT?.initialMargin },
    { label: 'Maintenance Margin', pVal: portfolio?.maintenanceMargin, rVal: regT?.maintenanceMargin },
    { label: 'Buying Power', pVal: portfolio?.buyingPower, rVal: regT?.buyingPower },
    { label: 'Margin Req Rate', pVal: portfolio?.marginRate, rVal: regT?.marginRate, isPct: true },
    { label: 'Max Leverage', pVal: portfolio?.maxLeverage, rVal: regT?.maxLeverage, isMult: true },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider">
          Portfolio vs Reg-T Comparison
        </span>
      </div>
      <table className="w-full text-[9px] font-mono">
        <thead className="bg-black/95 text-neutral-500 uppercase tracking-wider border-b border-border/20">
          <tr>
            <th className="px-2 py-1.5 text-left font-bold">Metric</th>
            <th className="px-2 py-1.5 text-right font-bold">Portfolio Margin</th>
            <th className="px-2 py-1.5 text-right font-bold">Reg-T</th>
            <th className="px-2 py-1.5 text-right font-bold">Savings</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            let pDisplay: string;
            let rDisplay: string;
            let savingsDisplay = '-';
            let savingsClass = 'text-neutral-500';

            if (row.isPct) {
              pDisplay = fmtPct(row.pVal);
              rDisplay = fmtPct(row.rVal);
            } else if (row.isMult) {
              pDisplay = row.pVal != null ? row.pVal.toFixed(1) + 'x' : '-';
              rDisplay = row.rVal != null ? row.rVal.toFixed(1) + 'x' : '-';
            } else {
              pDisplay = fmtAmt(row.pVal);
              rDisplay = fmtAmt(row.rVal);
            }

            if (row.pVal != null && row.rVal != null && !row.isPct && !row.isMult && row.rVal !== 0) {
              const diff = row.rVal - row.pVal;
              const diffPct = (diff / row.rVal) * 100;
              if (diff > 0) {
                savingsDisplay = fmtPct(diffPct);
                savingsClass = 'text-green-400';
              } else if (diff < 0) {
                savingsDisplay = fmtPct(diffPct);
                savingsClass = 'text-red-400';
              }
            }

            return (
              <tr
                key={row.label}
                className="border-b border-border/5 hover:bg-green-400/[0.02] transition-colors"
              >
                <td className="px-2 py-1 text-left text-neutral-400">{row.label}</td>
                <td className="px-2 py-1 text-right text-green-400 font-bold tabular-nums">
                  {pDisplay}
                </td>
                <td className="px-2 py-1 text-right text-white/70 tabular-nums">
                  {rDisplay}
                </td>
                <td className={`px-2 py-1 text-right font-bold tabular-nums ${savingsClass}`}>
                  {savingsDisplay}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// -- 5. Asset Class Efficiency (bar chart: standalone vs cross-margined) --

function AssetClassEfficiencySection({ items }: { items: AssetClassEfficiency[] }) {
  // Find max value for scaling bars
  const maxVal = items.reduce((mx: number, item: AssetClassEfficiency) => {
    const standalone = item?.standalone ?? 0;
    const crossMargined = item?.crossMargined ?? 0;
    return Math.max(mx, standalone, crossMargined);
  }, 0) || 1;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider">
          Asset Class Efficiency
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-3 py-1">
        <div className="flex items-center gap-1">
          <div className="w-[8px] h-[4px] bg-neutral-600" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Standalone</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-[8px] h-[4px] bg-green-400" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">Cross-Margined</span>
        </div>
      </div>

      <div className="px-3 pb-2 space-y-1.5">
        {items.map((item: AssetClassEfficiency, i: number) => {
          const standalone = item?.standalone ?? 0;
          const crossMargined = item?.crossMargined ?? 0;
          const standaloneWidth = (standalone / maxVal) * 100;
          const crossWidth = (crossMargined / maxVal) * 100;
          const savings = standalone > 0
            ? ((standalone - crossMargined) / standalone) * 100
            : 0;

          return (
            <div key={item?.assetClass ?? i} className="hover:bg-green-400/[0.02] transition-colors px-1 py-0.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[8px] font-mono font-bold text-white/80 uppercase">
                  {item?.assetClass ?? '-'}
                </span>
                <span className={`text-[7px] font-mono font-bold tabular-nums ${savingsColor(savings)}`}>
                  {savings > 0 ? '-' + fmtPct(savings) : fmtPct(savings)}
                </span>
              </div>
              {/* Standalone bar */}
              <div className="flex items-center gap-1 mb-[2px]">
                <div className="h-[4px] bg-neutral-800 flex-1 relative">
                  <div
                    className="h-full bg-neutral-600 transition-all"
                    style={{ width: `${standaloneWidth}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-neutral-500 tabular-nums w-[40px] text-right shrink-0">
                  {fmtAmt(standalone)}
                </span>
              </div>
              {/* Cross-margined bar */}
              <div className="flex items-center gap-1">
                <div className="h-[4px] bg-neutral-800 flex-1 relative">
                  <div
                    className="h-full bg-green-400 transition-all"
                    style={{ width: `${crossWidth}%` }}
                  />
                </div>
                <span className="text-[7px] font-mono text-green-400 tabular-nums w-[40px] text-right shrink-0">
                  {fmtAmt(crossMargined)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- 6. Historical Savings Sparkline (30 days) --

function HistoricalSavingsSection({ data }: { data: HistoricalSavings }) {
  const values: number[] | undefined = data?.values;
  if (!values || values.length === 0) return null;

  const spark = textSparkline(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const current = values[values.length - 1];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 border-b border-border/20">
        <span className="text-[8px] font-mono font-black text-green-400 uppercase tracking-wider">
          Margin Savings 30D
        </span>
      </div>

      <div className="px-3 py-2">
        <div className="text-[10px] font-mono tracking-tight leading-none text-green-400">
          {spark}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[7px] font-mono text-neutral-600">
            Min <span className="text-neutral-400 tabular-nums">{fmtPct(min)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Avg <span className="text-neutral-400 tabular-nums">{fmtPct(avg)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Max <span className="text-neutral-400 tabular-nums">{fmtPct(max)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Now <span className="text-green-400 font-bold tabular-nums">{fmtPct(current)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
