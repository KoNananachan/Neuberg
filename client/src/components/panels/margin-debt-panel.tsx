import { useMarginDebt } from '../../api/hooks/use-margin-debt';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types (matching server response) ──

type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
type Signal = 'ELEVATED' | 'NORMAL' | 'LOW';

interface CurrentLevels {
  marginDebt: number;
  freeCreditCash: number;
  freeCreditMargin: number;
  totalDebitBalances: number;
  netMarginDebt: number;
  change1m: number;
  change1y: number;
  percentile: number;
}

interface HistoricalDataPoint {
  date: string;
  marginDebt: number;
  freeCreditCash: number;
  freeCreditMargin: number;
  spx: number;
  marginToSpxRatio: number;
}

interface LeverageIndicator {
  name: string;
  value: number;
  percentile90d: number;
  signal: Signal;
  historicalAvg: number;
}

interface MarginDebtSummary {
  currentMarginDebt: number;
  monthlyChange: number;
  yoyChange: number;
  riskLevel: RiskLevel;
  spxCorrelation: number;
  timestamp: string;
}

interface MarginDebtData {
  currentLevels: CurrentLevels;
  historicalTrend: HistoricalDataPoint[];
  leverageIndicators: LeverageIndicator[];
  summary: MarginDebtSummary;
}

// ── Color Helpers ──

function riskLevelColor(level: RiskLevel): { text: string; bg: string; border: string } {
  switch (level) {
    case 'HIGH':
      return { text: 'text-red-400', bg: 'bg-red-400/15', border: 'border-red-400/30' };
    case 'ELEVATED':
      return { text: 'text-orange-400', bg: 'bg-orange-400/15', border: 'border-orange-400/30' };
    case 'MODERATE':
      return { text: 'text-yellow-400', bg: 'bg-yellow-400/15', border: 'border-yellow-400/30' };
    default:
      return { text: 'text-green-400', bg: 'bg-green-400/15', border: 'border-green-400/30' };
  }
}

function changeColor(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function fmtChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function signalColor(signal: Signal): { text: string; bg: string } {
  switch (signal) {
    case 'ELEVATED':
      return { text: 'text-red-400', bg: 'bg-red-400/10' };
    case 'LOW':
      return { text: 'text-green-400', bg: 'bg-green-400/10' };
    default:
      return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

function percentileBarColor(pctl: number): string {
  if (pctl >= 80) return 'bg-red-400';
  if (pctl >= 60) return 'bg-orange-400';
  if (pctl >= 40) return 'bg-yellow-400';
  return 'bg-green-400';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-amber-400/30">
      <div className="w-1 h-1 shrink-0 bg-amber-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-amber-400">
        {title}
      </span>
    </div>
  );
}

// ── Table Header Cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: MarginDebtSummary }) {
  const t = useT();
  const risk = riskLevelColor(summary.riskLevel);

  return (
    <div className="px-3 py-3 border-b border-amber-400/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[7px] font-mono font-black text-neutral-500 uppercase tracking-widest">
          {tr(t, 'mdCurrentDebt', 'FINRA Margin Debt')}
        </span>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 ${risk.bg} border ${risk.border}`}>
          <div className={`w-1 h-1 shrink-0 animate-pulse ${risk.text.replace('text-', 'bg-')}`} />
          <span className={`text-[7px] font-mono font-black uppercase tracking-wider ${risk.text}`}>
            {summary.riskLevel}
          </span>
        </div>
      </div>

      {/* Large margin debt display */}
      <div className="flex items-end gap-3 mb-1.5">
        <div className="flex items-baseline gap-1">
          <span className="text-[32px] font-mono font-black leading-none tabular-nums text-amber-400">
            ${summary.currentMarginDebt.toFixed(1)}
          </span>
          <span className="text-[10px] font-mono font-bold text-amber-400/60 uppercase">B</span>
        </div>
        <div className="flex flex-col gap-0.5 pb-1">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">MoM</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.monthlyChange)}`}>
              {fmtChange(summary.monthlyChange)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">YoY</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${changeColor(summary.yoyChange)}`}>
              {fmtChange(summary.yoyChange)}
            </span>
          </div>
        </div>
      </div>

      {/* SPX Correlation */}
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'mdSpxCorr', 'SPX Correlation')}
        </span>
        <span className="text-[8px] font-mono font-bold tabular-nums text-neutral-300">
          {summary.spxCorrelation.toFixed(2)}
        </span>
      </div>
    </div>
  );
}

// ── Current Levels Grid ──

function CurrentLevelsGrid({ levels }: { levels: CurrentLevels }) {
  const t = useT();

  const metrics = [
    { label: tr(t, 'mdMarginDebt', 'Margin Debt'), value: `$${levels.marginDebt.toFixed(1)}B`, color: 'text-amber-400' },
    { label: tr(t, 'mdFreeCreditCash', 'Free Credit (Cash)'), value: `$${levels.freeCreditCash.toFixed(1)}B`, color: 'text-emerald-400' },
    { label: tr(t, 'mdFreeCreditMargin', 'Free Credit (Margin)'), value: `$${levels.freeCreditMargin.toFixed(1)}B`, color: 'text-emerald-400' },
    { label: tr(t, 'mdTotalDebit', 'Total Debit'), value: `$${levels.totalDebitBalances.toFixed(1)}B`, color: 'text-red-400' },
    { label: tr(t, 'mdNetMargin', 'Net Margin Debt'), value: `$${levels.netMarginDebt.toFixed(1)}B`, color: levels.netMarginDebt >= 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: tr(t, 'mdPercentile', 'Percentile (10Y)'), value: `${levels.percentile}th`, color: levels.percentile >= 80 ? 'text-red-400' : levels.percentile >= 60 ? 'text-orange-400' : levels.percentile >= 40 ? 'text-yellow-400' : 'text-green-400' },
  ];

  return (
    <div className="px-2 py-1.5">
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        {metrics.map((m) => (
          <div key={m.label} className="flex flex-col gap-0.5">
            <span className="text-[6px] font-mono font-bold text-neutral-600 uppercase tracking-wider truncate">
              {m.label}
            </span>
            <span className={`text-[11px] font-mono font-black tabular-nums ${m.color}`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Leverage Indicators Table ──

function LeverageIndicatorsTable({ indicators }: { indicators: LeverageIndicator[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Indicator" align="left" />
            <ThCell label="Value" align="right" />
            <ThCell label="90D Pctl" align="left" />
            <ThCell label="Signal" align="left" />
            <ThCell label="Hist Avg" align="right" />
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind) => {
            const sig = signalColor(ind.signal);
            const barColor = percentileBarColor(ind.percentile90d);
            const deviation = ind.value - ind.historicalAvg;
            const valueColor = deviation > 0 ? 'text-red-400' : deviation < 0 ? 'text-green-400' : 'text-neutral-300';

            return (
              <tr key={ind.name} className="border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {ind.name}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${valueColor}`}>
                  {ind.value.toFixed(2)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1.5 bg-neutral-900 relative">
                      <div
                        className={`absolute top-0 left-0 h-full ${barColor} opacity-70`}
                        style={{ width: `${Math.min(ind.percentile90d, 100)}%` }}
                      />
                    </div>
                    <span className="text-[7px] font-mono font-bold tabular-nums text-neutral-400">
                      {ind.percentile90d}
                    </span>
                  </div>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${sig.text} ${sig.bg}`}>
                    {ind.signal}
                  </span>
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-500 tabular-nums">
                  {ind.historicalAvg.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Historical Trend Table ──

function HistoricalTrendTable({ data }: { data: HistoricalDataPoint[] }) {
  // Most recent first
  const sorted = [...data].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Date" align="left" />
            <ThCell label="Margin Debt ($B)" align="right" />
            <ThCell label="Free Cr Cash" align="right" />
            <ThCell label="Free Cr Mrgn" align="right" />
            <ThCell label="S&P 500" align="right" />
            <ThCell label="Mrgn/SPX" align="right" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => {
            // Compare with previous month for coloring
            const prev = sorted[i + 1];
            const mdColor = prev
              ? row.marginDebt > prev.marginDebt ? 'text-green-400' : row.marginDebt < prev.marginDebt ? 'text-red-400' : 'text-neutral-300'
              : 'text-neutral-300';
            const spxColor = prev
              ? row.spx > prev.spx ? 'text-green-400' : row.spx < prev.spx ? 'text-red-400' : 'text-neutral-300'
              : 'text-neutral-300';

            return (
              <tr key={row.date} className="border-b border-border/10 hover:bg-amber-400/[0.02] transition-colors">
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                  {row.date}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${mdColor}`}>
                  {row.marginDebt.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                  {row.freeCreditCash.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 tabular-nums">
                  {row.freeCreditMargin.toFixed(1)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${spxColor}`}>
                  {row.spx.toFixed(0)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-500 tabular-nums">
                  {row.marginToSpxRatio.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function MarginDebtPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarginDebt();

  const debtData = data as MarginDebtData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-amber-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0">
            <rect x="1" y="8" width="3" height="5" fill="none" stroke="#fbbf24" strokeWidth="1" />
            <rect x="5.5" y="5" width="3" height="8" fill="none" stroke="#fbbf24" strokeWidth="1" />
            <rect x="10" y="2" width="3" height="11" fill="none" stroke="#fbbf24" strokeWidth="1" />
            <line x1="1" y1="4" x2="13" y2="1" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-amber-400">
            {tr(t, 'mdTitle', 'Margin Debt Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {debtData?.summary && (
            <span className={`text-[8px] font-mono font-black tabular-nums ${riskLevelColor(debtData.summary.riskLevel).text}`}>
              ${debtData.summary.currentMarginDebt.toFixed(1)}B
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !debtData && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-amber-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {/* No data */}
      {!debtData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {debtData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary Bar */}
          {debtData.summary && (
            <SummaryBar summary={debtData.summary} />
          )}

          {/* Current Levels */}
          {debtData.currentLevels && (
            <>
              <SectionHeader title={tr(t, 'mdCurrentLevels', 'Current Levels')} />
              <CurrentLevelsGrid levels={debtData.currentLevels} />
            </>
          )}

          {/* Leverage Indicators */}
          {debtData.leverageIndicators && debtData.leverageIndicators.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'mdLeverage', 'Leverage Indicators')} />
              <LeverageIndicatorsTable indicators={debtData.leverageIndicators} />
            </>
          )}

          {/* Historical Trend */}
          {debtData.historicalTrend && debtData.historicalTrend.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'mdHistorical', 'Historical Trend')} />
              <HistoricalTrendTable data={debtData.historicalTrend} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
