import { usePortfolioHedging } from '../../api/hooks/use-portfolio-hedging';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ─────────────────────────────────────────────

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ────────────────────────────────────────────────────────────

interface HedgingStrategy {
  name: string;
  instrument: string;
  type: string;
  cost: number;
  protectionLevel: number;
  breakeven: number;
  maxLoss: number;
  effectiveness: number;
  sharpeImpact: number;
  description: string;
}

interface RiskMetrics {
  VaR95: number;
  VaR99: number;
  CVaR: number;
  maxDrawdown: number;
  beta: number;
  correlation: number;
  volatility: number;
  skewness: number;
  kurtosis: number;
}

interface OptionsHedge {
  description: string;
  underlying: string;
  strike: number;
  expiry: string;
  type: string;
  premium: number;
  notional: number;
  delta: number;
  gamma: number;
  costBps: number;
  protectionRange: string;
}

interface TailRiskScenario {
  scenario: string;
  unhedgedLoss: number;
  hedgedLoss: number;
  reduction: number;
  bestHedge: string;
}

interface HedgingSummary {
  totalHedgeCost: number;
  portfolioVaR95: number;
  hedgedVaR95: number;
  varReduction: number;
  optimalStrategy: string;
  costEfficiencyRank: string[];
}

interface PortfolioHedgingData {
  strategies: HedgingStrategy[];
  riskMetrics: RiskMetrics;
  optionsHedges: OptionsHedge[];
  tailRiskProtection: TailRiskScenario[];
  summary: HedgingSummary;
}

// ── Color / formatting helpers ───────────────────────────────────────

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '-';
  return `${n.toFixed(1)} bps`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  const sign = n >= 0 ? '' : '-';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function effectivenessColor(v: number): string {
  if (v >= 80) return 'text-emerald-400';
  if (v >= 60) return 'text-green-400';
  if (v >= 40) return 'text-amber-400';
  if (v >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function costColor(v: number): string {
  if (v <= 0.5) return 'text-emerald-400';
  if (v <= 1.0) return 'text-green-400';
  if (v <= 2.0) return 'text-amber-400';
  if (v <= 3.0) return 'text-orange-400';
  return 'text-red-400';
}

function sharpeColor(v: number): string {
  if (v >= 0) return 'text-emerald-400';
  if (v >= -0.1) return 'text-amber-400';
  return 'text-red-400';
}

// ── Main Panel ───────────────────────────────────────────────────────

export function PortfolioHedgingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = usePortfolioHedging();

  const hedgingData = data as PortfolioHedgingData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-indigo-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 12 L6 8 L10 10 L14 4" stroke="#818cf8" strokeWidth="1.5" fill="none" opacity="0.8" />
            <path d="M2 14 L6 10 L10 12 L14 6" stroke="#818cf8" strokeWidth="0.8" fill="none" opacity="0.3" strokeDasharray="2,2" />
            <circle cx="14" cy="4" r="1.2" fill="#818cf8" opacity="0.9" />
            <circle cx="14" cy="6" r="1" fill="#818cf8" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-indigo-400">
            {tr(t, 'portfolioHedgingTitle', 'Portfolio Hedging Analysis')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-indigo-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !hedgingData && (
          <div className="text-center py-8 text-indigo-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'LOADING...')}
          </div>
        )}

        {!hedgingData && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'portfolioHedgingNoData', 'No hedging data available')}
          </div>
        )}

        {hedgingData && (
          <>
            <RiskMetricsGrid metrics={hedgingData.riskMetrics} />
            <StrategiesTable strategies={hedgingData.strategies} />
            <OptionsHedgesTable hedges={hedgingData.optionsHedges} />
            <TailRiskSection scenarios={hedgingData.tailRiskProtection} />
            <SummarySection summary={hedgingData.summary} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Risk Metrics Grid ────────────────────────────────────────────────

function RiskMetricsGrid({ metrics }: { metrics: RiskMetrics }) {
  const t = useT();

  const items: { label: string; value: string; color: string }[] = [
    { label: 'VaR 95%', value: fmtPct(metrics.VaR95), color: metrics.VaR95 < -5 ? 'text-red-400' : 'text-amber-400' },
    { label: 'VaR 99%', value: fmtPct(metrics.VaR99), color: metrics.VaR99 < -8 ? 'text-red-400' : 'text-amber-400' },
    { label: 'CVaR', value: fmtPct(metrics.CVaR), color: 'text-red-400' },
    { label: 'MAX DD', value: fmtPct(metrics.maxDrawdown), color: 'text-red-400' },
    { label: 'BETA', value: fmtNum(metrics.beta), color: metrics.beta > 1 ? 'text-amber-400' : 'text-emerald-400' },
    { label: 'CORR', value: fmtNum(metrics.correlation), color: 'text-neutral-300' },
    { label: 'VOL', value: fmtPct(metrics.volatility), color: metrics.volatility > 20 ? 'text-red-400' : 'text-amber-400' },
    { label: 'SKEW', value: fmtNum(metrics.skewness), color: metrics.skewness < 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'KURT', value: fmtNum(metrics.kurtosis), color: metrics.kurtosis > 3 ? 'text-amber-400' : 'text-neutral-300' },
  ];

  return (
    <div className="px-3 py-2 border-b border-indigo-400/30">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400/60 mb-2">
        {tr(t, 'portfolioHedgingRiskMetrics', 'Risk Metrics')}
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-[8px] font-mono text-neutral-500 uppercase">{item.label}</span>
            <span className={`text-[9px] font-mono font-bold ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hedging Strategies Table ─────────────────────────────────────────

function StrategiesTable({ strategies }: { strategies: HedgingStrategy[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-indigo-400/30">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400/60 mb-2">
        {tr(t, 'portfolioHedgingStrategies', 'Hedging Strategies')}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="text-neutral-500 uppercase border-b border-indigo-400/20">
              <th className="text-left py-1 pr-2 font-normal">Strategy</th>
              <th className="text-left py-1 pr-2 font-normal">Instrument</th>
              <th className="text-right py-1 pr-2 font-normal">Cost (Ann.)</th>
              <th className="text-right py-1 pr-2 font-normal">Protection</th>
              <th className="text-right py-1 pr-2 font-normal">B/E</th>
              <th className="text-right py-1 pr-2 font-normal">Max Loss</th>
              <th className="text-right py-1 pr-2 font-normal">Effect.</th>
              <th className="text-right py-1 font-normal">Sharpe</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((s, i) => (
              <tr
                key={i}
                className="border-b border-neutral-800/30 hover:bg-indigo-400/[0.02] transition-colors"
                title={s.description}
              >
                <td className="py-1 pr-2 text-neutral-200 whitespace-nowrap">{s.name}</td>
                <td className="py-1 pr-2 text-neutral-400 whitespace-nowrap">{s.instrument}</td>
                <td className={`py-1 pr-2 text-right font-bold ${costColor(s.cost)}`}>
                  {fmtPct(s.cost)}
                </td>
                <td className="py-1 pr-2 text-right text-neutral-300">{fmtPct(s.protectionLevel)}</td>
                <td className="py-1 pr-2 text-right text-neutral-400">{fmtPct(s.breakeven)}</td>
                <td className="py-1 pr-2 text-right text-red-400">{fmtPct(s.maxLoss)}</td>
                <td className="py-1 pr-2 text-right">
                  <span className={`font-bold ${effectivenessColor(s.effectiveness)}`}>
                    {s.effectiveness.toFixed(0)}%
                  </span>
                </td>
                <td className={`py-1 text-right font-bold ${sharpeColor(s.sharpeImpact)}`}>
                  {s.sharpeImpact > 0 ? '+' : ''}{s.sharpeImpact.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Options Hedges Table ─────────────────────────────────────────────

function OptionsHedgesTable({ hedges }: { hedges: OptionsHedge[] }) {
  const t = useT();

  return (
    <div className="px-3 py-2 border-b border-indigo-400/30">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400/60 mb-2">
        {tr(t, 'portfolioHedgingOptions', 'Options Hedges')}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="text-neutral-500 uppercase border-b border-indigo-400/20">
              <th className="text-left py-1 pr-2 font-normal">Underlying</th>
              <th className="text-left py-1 pr-2 font-normal">Type</th>
              <th className="text-right py-1 pr-2 font-normal">Strike</th>
              <th className="text-left py-1 pr-2 font-normal">Expiry</th>
              <th className="text-right py-1 pr-2 font-normal">Premium</th>
              <th className="text-right py-1 pr-2 font-normal">Notional</th>
              <th className="text-right py-1 pr-2 font-normal">Delta</th>
              <th className="text-right py-1 pr-2 font-normal">Gamma</th>
              <th className="text-right py-1 pr-2 font-normal">Cost</th>
              <th className="text-left py-1 font-normal">Range</th>
            </tr>
          </thead>
          <tbody>
            {hedges.map((h, i) => (
              <tr
                key={i}
                className="border-b border-neutral-800/30 hover:bg-indigo-400/[0.02] transition-colors"
                title={h.description}
              >
                <td className="py-1 pr-2 text-neutral-200 whitespace-nowrap">{h.underlying}</td>
                <td className="py-1 pr-2 text-neutral-400 uppercase whitespace-nowrap">{h.type}</td>
                <td className="py-1 pr-2 text-right text-neutral-300">{fmtNum(h.strike, 0)}</td>
                <td className="py-1 pr-2 text-neutral-500 whitespace-nowrap">{h.expiry}</td>
                <td className="py-1 pr-2 text-right text-amber-400">{fmtDollar(h.premium)}</td>
                <td className="py-1 pr-2 text-right text-neutral-300">{fmtDollar(h.notional)}</td>
                <td className="py-1 pr-2 text-right text-neutral-300">{fmtNum(h.delta, 3)}</td>
                <td className="py-1 pr-2 text-right text-neutral-400">{fmtNum(h.gamma, 4)}</td>
                <td className="py-1 pr-2 text-right text-amber-400">{fmtBps(h.costBps)}</td>
                <td className="py-1 text-neutral-400 whitespace-nowrap">{h.protectionRange}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tail Risk Scenarios ──────────────────────────────────────────────

function TailRiskSection({ scenarios }: { scenarios: TailRiskScenario[] }) {
  const t = useT();

  const maxLoss = Math.max(...scenarios.map((s) => Math.abs(s.unhedgedLoss)));

  return (
    <div className="px-3 py-2 border-b border-indigo-400/30">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400/60 mb-2">
        {tr(t, 'portfolioHedgingTailRisk', 'Tail Risk Protection')}
      </div>
      <div className="space-y-2">
        {scenarios.map((s, i) => {
          const unhedgedPct = maxLoss > 0 ? (Math.abs(s.unhedgedLoss) / maxLoss) * 100 : 0;
          const hedgedPct = maxLoss > 0 ? (Math.abs(s.hedgedLoss) / maxLoss) * 100 : 0;

          return (
            <div key={i} className="hover:bg-indigo-400/[0.02] transition-colors px-1 py-1">
              {/* Scenario header */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] font-mono font-bold text-neutral-200">{s.scenario}</span>
                <span className="text-[8px] font-mono font-bold text-emerald-400">
                  -{s.reduction.toFixed(0)}% reduction
                </span>
              </div>

              {/* Unhedged bar */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[7px] font-mono text-neutral-500 w-14 shrink-0">UNHEDGED</span>
                <div className="flex-1 h-2.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-red-500/60"
                    style={{ width: `${unhedgedPct}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-red-400 w-14 text-right shrink-0">
                  {fmtPct(s.unhedgedLoss)}
                </span>
              </div>

              {/* Hedged bar */}
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[7px] font-mono text-neutral-500 w-14 shrink-0">HEDGED</span>
                <div className="flex-1 h-2.5 bg-neutral-900 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-indigo-500/60"
                    style={{ width: `${hedgedPct}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-indigo-400 w-14 text-right shrink-0">
                  {fmtPct(s.hedgedLoss)}
                </span>
              </div>

              {/* Best hedge label */}
              <div className="text-[7px] font-mono text-neutral-500 mt-0.5">
                Best: <span className="text-neutral-400">{s.bestHedge}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Summary Section ──────────────────────────────────────────────────

function SummarySection({ summary }: { summary: HedgingSummary }) {
  const t = useT();

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black font-mono uppercase tracking-wider text-indigo-400/60 mb-2">
        {tr(t, 'portfolioHedgingSummary', 'Optimal Strategy Recommendation')}
      </div>

      {/* Key metrics row */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral-500">TOTAL HEDGE COST</span>
          <span className="text-[9px] font-mono font-bold text-amber-400">
            {fmtPct(summary.totalHedgeCost)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral-500">VAR REDUCTION</span>
          <span className="text-[9px] font-mono font-bold text-emerald-400">
            {fmtPct(summary.varReduction)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral-500">PORTFOLIO VaR95</span>
          <span className="text-[9px] font-mono font-bold text-red-400">
            {fmtPct(summary.portfolioVaR95)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-mono text-neutral-500">HEDGED VaR95</span>
          <span className="text-[9px] font-mono font-bold text-indigo-400">
            {fmtPct(summary.hedgedVaR95)}
          </span>
        </div>
      </div>

      {/* Optimal strategy callout */}
      <div className="border border-indigo-400/30 bg-indigo-400/[0.04] px-2 py-1.5 mb-2">
        <div className="text-[7px] font-mono text-indigo-400/60 uppercase mb-0.5">Optimal Strategy</div>
        <div className="text-[9px] font-mono font-bold text-indigo-300">{summary.optimalStrategy}</div>
      </div>

      {/* Cost efficiency ranking */}
      {summary.costEfficiencyRank && summary.costEfficiencyRank.length > 0 && (
        <div>
          <div className="text-[7px] font-mono text-neutral-500 uppercase mb-1">Cost Efficiency Rank</div>
          <div className="space-y-0.5">
            {summary.costEfficiencyRank.map((name, i) => (
              <div key={i} className="flex items-center gap-1.5 hover:bg-indigo-400/[0.02] transition-colors">
                <span className="text-[8px] font-mono text-indigo-400/80 w-3 text-right">{i + 1}.</span>
                <span className="text-[8px] font-mono text-neutral-300">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
