import { useRiskParity } from '../../api/hooks/use-risk-parity';
import { useT, tr, TFn } from '../../i18n';

// ── Constants ──

const ACCENT = '#a3e635'; // lime-400

// ── Formatting helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals);
}

function pctColor(v: number | null | undefined): string {
  if (v == null) return '#71717a';
  return v >= 0 ? '#22c55e' : '#ef4444';
}

// ── Main Panel ──

export function RiskParityPanel() {
  const t = useT();
  const { data, isLoading } = useRiskParity();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 shrink-0" style={{ backgroundColor: ACCENT }} />
        <span
          className="text-[9px] font-mono font-black uppercase tracking-wider"
          style={{ color: ACCENT }}
        >
          {tr(t, 'panelRiskParity', 'RISK PARITY')}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-12">
            <span
              className="text-[9px] font-mono uppercase tracking-wider"
              style={{ color: ACCENT }}
            >
              {tr(t, 'loading', 'Loading...')}
            </span>
          </div>
        )}

        {data && (
          <>
            <AssetAllocationTable data={data} />
            <PortfolioMetrics data={data} />
            <RiskDecomposition data={data} />
            <HistoricalComparison data={data} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Asset Allocation ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AssetAllocationTable({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assets: any[] = data?.assetAllocation ?? data?.assets ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'rpAssetAllocation', 'ASSET ALLOCATION')}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600">ASSET CLASS</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">NOTIONAL WT</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">RISK CONTRIB</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">VOL</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">LEVER</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {assets.map((asset: any, i: number) => (
        <div
          key={asset?.name ?? asset?.assetClass ?? i}
          className="grid grid-cols-[1.4fr_0.7fr_0.7fr_0.6fr_0.5fr] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white truncate">
            {asset?.name ?? asset?.assetClass ?? '--'}
          </span>
          <span className="text-[9px] font-mono text-neutral-300 text-right">
            {fmtPct(asset?.notionalWeight ?? asset?.weight, 1)}
          </span>
          <span
            className="text-[9px] font-mono font-bold text-right"
            style={{ color: ACCENT }}
          >
            {fmtPct(asset?.riskContribution ?? asset?.riskContrib, 1)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtPct(asset?.vol ?? asset?.volatility, 1)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtNum(asset?.leverage, 1)}x
          </span>
        </div>
      ))}

      {assets.length === 0 && (
        <div className="px-3 py-3 text-center text-[9px] font-mono text-neutral-600 uppercase">
          {tr(t, 'noData', 'No data available')}
        </div>
      )}
    </div>
  );
}

// ── 2. Portfolio Metrics ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PortfolioMetrics({ data }: { data: any }) {
  const t = useT();
  const metrics = data?.portfolioMetrics ?? data?.portfolio ?? {};

  const rows: { label: string; value: string; color?: string }[] = [
    {
      label: 'TARGET VOL',
      value: fmtPct(metrics?.targetVol ?? metrics?.targetVolatility, 2),
    },
    {
      label: 'REALIZED VOL',
      value: fmtPct(metrics?.realizedVol ?? metrics?.realizedVolatility, 2),
    },
    {
      label: 'SHARPE',
      value: fmtNum(metrics?.sharpe ?? metrics?.sharpeRatio, 2),
      color: (metrics?.sharpe ?? metrics?.sharpeRatio ?? 0) >= 1 ? '#22c55e' : undefined,
    },
    {
      label: 'LEVERAGE',
      value: `${fmtNum(metrics?.leverage ?? metrics?.totalLeverage, 1)}x`,
    },
    {
      label: 'MAX DD',
      value: fmtPct(metrics?.maxDrawdown ?? metrics?.maxDD, 2),
      color: '#ef4444',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'rpPortfolioMetrics', 'PORTFOLIO METRICS')}
        </div>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors"
        >
          <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
            {row.label}
          </span>
          <span
            className="text-[9px] font-mono font-bold"
            style={{ color: row.color ?? ACCENT }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Risk Decomposition ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskDecomposition({ data }: { data: any }) {
  const t = useT();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factors: any[] = data?.riskDecomposition ?? data?.riskFactors ?? data?.riskBudget ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'rpRiskDecomposition', 'RISK DECOMPOSITION')}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.4fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600">FACTOR</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">CONTRIBUTION %</span>
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600 text-right">MARGINAL</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {factors.map((factor: any, i: number) => {
        const contrib = factor?.contribution ?? factor?.pctOfTotal ?? factor?.riskParityRisk ?? 0;
        const maxBar = 100;
        const barWidth = Math.min((Math.abs(contrib) / maxBar) * 100, 100);

        return (
          <div
            key={factor?.factor ?? factor?.name ?? i}
            className="grid grid-cols-[1.4fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">
              {factor?.factor ?? factor?.name ?? '--'}
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <div className="w-12 h-1 bg-white/[0.04] relative shrink-0">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${barWidth}%`,
                    backgroundColor: ACCENT,
                    opacity: 0.5,
                  }}
                />
              </div>
              <span
                className="text-[9px] font-mono font-bold"
                style={{ color: ACCENT }}
              >
                {fmtPct(contrib, 1)}
              </span>
            </div>
            <span className="text-[9px] font-mono text-neutral-400 text-right">
              {fmtNum(factor?.marginal ?? factor?.marginalContribution ?? factor?.marginalVarContribution, 3)}
            </span>
          </div>
        );
      })}

      {factors.length === 0 && (
        <div className="px-3 py-3 text-center text-[9px] font-mono text-neutral-600 uppercase">
          {tr(t, 'noData', 'No data available')}
        </div>
      )}
    </div>
  );
}

// ── 4. Historical Comparison vs 60/40 and S&P ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoricalComparison({ data }: { data: any }) {
  const t = useT();
  const comparison = data?.historicalComparison ?? data?.comparison ?? {};

  const strategies: {
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stats: any;
    accent: string;
  }[] = [
    {
      label: 'RISK PARITY',
      stats: comparison?.riskParity ?? comparison?.rp ?? {},
      accent: ACCENT,
    },
    {
      label: '60/40',
      stats: comparison?.sixtyForty ?? comparison?.['60_40'] ?? comparison?.balanced ?? {},
      accent: '#71717a',
    },
    {
      label: 'S&P 500',
      stats: comparison?.sp500 ?? comparison?.spx ?? comparison?.equity ?? {},
      accent: '#71717a',
    },
  ];

  const metricKeys: { key: string; label: string; higherIsBetter: boolean; isMoney?: boolean }[] = [
    { key: 'cagr', label: 'CAGR', higherIsBetter: true },
    { key: 'vol', label: 'VOL', higherIsBetter: false },
    { key: 'sharpe', label: 'SHARPE', higherIsBetter: true },
    { key: 'maxDrawdown', label: 'MAX DD', higherIsBetter: false },
    { key: 'calmar', label: 'CALMAR', higherIsBetter: true },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'rpHistoricalComparison', 'HISTORICAL COMPARISON')}
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[9px] font-mono font-black uppercase tracking-wider text-neutral-600">METRIC</span>
        {strategies.map((s) => (
          <span
            key={s.label}
            className="text-[9px] font-mono font-black uppercase tracking-wider text-right"
            style={{ color: s.accent }}
          >
            {s.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      {metricKeys.map((metric) => {
        const values = strategies.map((s) => {
          const v = s.stats?.[metric.key] ?? s.stats?.[metric.key.toLowerCase()];
          return typeof v === 'number' ? v : null;
        });

        // Determine best value
        const validValues = values.filter((v): v is number => v !== null);
        let bestIdx = -1;
        if (validValues.length > 0) {
          const compare = metric.higherIsBetter ? Math.max : Math.min;
          const best = compare(...validValues);
          bestIdx = values.findIndex((v) => v === best);
        }

        return (
          <div
            key={metric.key}
            className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
              {metric.label}
            </span>
            {values.map((v, idx) => {
              const isBest = idx === bestIdx && validValues.length > 1;
              const isDD = metric.key === 'maxDrawdown';
              const displayColor = isBest
                ? '#22c55e'
                : v != null
                  ? isDD
                    ? pctColor(v != null ? -Math.abs(v) : null)
                    : '#a1a1aa'
                  : '#52525b';

              return (
                <span
                  key={strategies[idx].label}
                  className="text-[9px] font-mono font-bold text-right"
                  style={{ color: displayColor }}
                >
                  {v != null
                    ? metric.key === 'sharpe' || metric.key === 'calmar'
                      ? fmtNum(v, 2)
                      : fmtPct(v, 2)
                    : '--'}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
