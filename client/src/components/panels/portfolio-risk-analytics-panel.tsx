import { usePortfolioRiskAnalytics } from '../../api/hooks/use-portfolio-risk-analytics';
import { useT } from '../../i18n';
import { Loader2, RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Color / formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function returnColor(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function impactColor(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n < 0) return '#ef4444';
  if (n > 0) return '#22c55e';
  return '#71717a';
}

function trendBadge(trend: string): { text: string; bg: string } {
  const lower = (trend || '').toLowerCase();
  if (lower === 'rising' || lower === 'up' || lower === 'improving')
    return { text: 'text-green-400', bg: 'bg-green-400/15' };
  if (lower === 'falling' || lower === 'down' || lower === 'deteriorating')
    return { text: 'text-red-400', bg: 'bg-red-400/15' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-400/10' };
}

// ── Main Panel ──

export function PortfolioRiskAnalyticsPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = usePortfolioRiskAnalytics();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="9" width="3" height="6" fill="#f472b6" opacity="0.5" />
            <rect x="5" y="5" width="3" height="10" fill="#f472b6" opacity="0.7" />
            <rect x="9" y="2" width="3" height="13" fill="#f472b6" opacity="0.85" />
            <rect x="13" y="7" width="2" height="8" fill="#f472b6" opacity="0.6" />
            <line x1="1" y1="8" x2="15" y2="3" stroke="#f472b6" strokeWidth="1" opacity="0.4" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-pink-400">
            {tr(t, 'praTitle', 'Portfolio Risk Analytics')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-pink-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-pink-400" />
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'praError', 'Failed to load data')}
          </div>
        )}

        {data && (
          <>
            <MarketSummaryBar summary={data.marketSummary} t={t} />
            <VaRDecompositionTable rows={data.varDecomposition} t={t} />
            <StressTestsTable rows={data.stressTests} t={t} />
            <FactorExposureTable rows={data.factorExposure} t={t} />
            <ScenarioAnalysisTable rows={data.scenarioAnalysis} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: ReturnType<typeof useT> }) {
  if (!summary) return null;

  const metrics = [
    {
      label: 'VaR 95%',
      value: fmtPct(summary.portfolioVaR95),
      color: impactColor(summary.portfolioVaR95),
    },
    {
      label: 'VaR 99%',
      value: fmtPct(summary.portfolioVaR99),
      color: impactColor(summary.portfolioVaR99),
    },
    {
      label: 'Beta to SPX',
      value: fmtNum(summary.betaToSPX),
      color: '#f472b6',
    },
    {
      label: 'Tracking Error',
      value: fmtPct(summary.trackingError),
      color: '#a1a1aa',
    },
    {
      label: 'Sharpe Ratio',
      value: fmtNum(summary.sharpeRatio),
      color: summary.sharpeRatio > 0 ? '#22c55e' : '#ef4444',
    },
    {
      label: 'Risk Budget Used',
      value: fmtPct(summary.riskBudgetUsed),
      color: summary.riskBudgetUsed > 80 ? '#ef4444' : summary.riskBudgetUsed > 60 ? '#fb923c' : '#22c55e',
    },
  ];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'praMarketSummary', 'Market Summary')}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="px-1.5 py-1 border border-border/20 hover:bg-pink-400/[0.02] transition-colors"
          >
            <div className="text-[6px] font-mono text-neutral-600 uppercase truncate">{m.label}</div>
            <div
              className="text-[9px] font-mono font-black tabular-nums mt-0.5"
              style={{ color: m.color }}
            >
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. VaR Decomposition Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VaRDecompositionTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const headers = ['Asset Class', 'Weight', 'VaR 95', 'VaR 99', 'CVaR', 'Marginal', 'Component', 'Divers.'];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'praVarDecomp', 'VaR Decomposition')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_40px_40px_40px_40px_44px_48px_40px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, number | string>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_40px_40px_40px_40px_44px_48px_40px] gap-0.5 px-1 py-[3px] hover:bg-pink-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
        >
          <span className="text-[8px] font-bold text-pink-400 truncate">{row.assetClass}</span>
          <span className="text-white tabular-nums">{fmtPct(row.weight as number)}</span>
          <span className="tabular-nums" style={{ color: impactColor(row.var95 as number) }}>
            {fmtPct(row.var95 as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.var99 as number) }}>
            {fmtPct(row.var99 as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.cvar as number) }}>
            {fmtPct(row.cvar as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.marginalVaR as number) }}>
            {fmtPct(row.marginalVaR as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.componentVaR as number) }}>
            {fmtPct(row.componentVaR as number)}
          </span>
          <span className="tabular-nums" style={{ color: returnColor(row.diversificationBenefit as number) }}>
            {fmtPct(row.diversificationBenefit as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Stress Tests Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StressTestsTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const headers = ['Scenario', 'Portfolio', 'Equity', 'FI', 'Commodity', 'FX', 'Max DD', 'Recovery'];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'praStressTests', 'Stress Tests')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_44px_36px_50px_36px_40px_44px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, number | string>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_48px_44px_36px_50px_36px_40px_44px] gap-0.5 px-1 py-[3px] hover:bg-pink-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate">{row.scenario}</span>
          <span className="font-bold tabular-nums" style={{ color: impactColor(row.portfolioImpact as number) }}>
            {fmtPct(row.portfolioImpact as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.equityImpact as number) }}>
            {fmtPct(row.equityImpact as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.fiImpact as number) }}>
            {fmtPct(row.fiImpact as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.commodityImpact as number) }}>
            {fmtPct(row.commodityImpact as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.fxImpact as number) }}>
            {fmtPct(row.fxImpact as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.maxDrawdown as number) }}>
            {fmtPct(row.maxDrawdown as number)}
          </span>
          <span className="text-neutral-400 tabular-nums">
            {row.recoveryDays != null ? `${row.recoveryDays}d` : '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4. Factor Exposure Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FactorExposureTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const headers = ['Factor', 'Exposure', 'Benchmark', 'Active', 't-Stat', 'R\u00B2', 'Contrib%', 'Trend'];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'praFactorExposure', 'Factor Exposure')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_50px_40px_36px_34px_44px_50px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, number | string>, i: number) => {
        const activeVal = row.active as number;
        const badge = trendBadge(row.trend as string);

        return (
          <div
            key={i}
            className="grid grid-cols-[1fr_44px_50px_40px_36px_34px_44px_50px] gap-0.5 px-1 py-[3px] hover:bg-pink-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-pink-400 truncate">{row.factor}</span>
            <span className="text-white tabular-nums">{fmtNum(row.exposure as number)}</span>
            <span className="text-neutral-400 tabular-nums">{fmtNum(row.benchmark as number)}</span>
            <span className="font-bold tabular-nums" style={{ color: returnColor(activeVal) }}>
              {activeVal > 0 ? '+' : ''}{fmtNum(activeVal)}
            </span>
            <span className="text-neutral-400 tabular-nums">{fmtNum(row.tStat as number)}</span>
            <span className="text-neutral-400 tabular-nums">{fmtNum(row.rSquared as number)}</span>
            <span className="tabular-nums" style={{ color: returnColor(row.contribution as number) }}>
              {fmtPct(row.contribution as number)}
            </span>
            <span className={`text-[7px] font-black uppercase px-1 py-[1px] ${badge.text} ${badge.bg}`}>
              {row.trend}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Scenario Analysis Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScenarioAnalysisTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const headers = ['Scenario', 'Prob%', 'Equity%', 'Bond%', 'Portfolio%', 'Sharpe', 'Max DD%'];

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'praScenarioAnalysis', 'Scenario Analysis')}
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_36px_44px_40px_50px_38px_42px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, number | string>, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_36px_44px_40px_50px_38px_42px] gap-0.5 px-1 py-[3px] hover:bg-pink-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
        >
          <span className="text-[8px] font-bold text-neutral-300 truncate">{row.scenario}</span>
          <span className="text-neutral-400 tabular-nums">{fmtNum(row.probability as number, 1)}</span>
          <span className="font-bold tabular-nums" style={{ color: returnColor(row.equityReturn as number) }}>
            {fmtPct(row.equityReturn as number)}
          </span>
          <span className="tabular-nums" style={{ color: returnColor(row.bondReturn as number) }}>
            {fmtPct(row.bondReturn as number)}
          </span>
          <span className="font-bold tabular-nums" style={{ color: returnColor(row.portfolioReturn as number) }}>
            {fmtPct(row.portfolioReturn as number)}
          </span>
          <span className="tabular-nums" style={{ color: (row.sharpe as number) > 0 ? '#22c55e' : '#ef4444' }}>
            {fmtNum(row.sharpe as number)}
          </span>
          <span className="tabular-nums" style={{ color: impactColor(row.maxDD as number) }}>
            {fmtPct(row.maxDD as number)}
          </span>
        </div>
      ))}
    </div>
  );
}
