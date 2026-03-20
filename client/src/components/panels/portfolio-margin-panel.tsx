import { usePortfolioMargin } from '../../api/hooks/use-portfolio-margin';
import { useT, tr, TFn } from '../../i18n';
import { Loader2, RefreshCw } from 'lucide-react';

// ── Local types (hook contract) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PortfolioMarginData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AssetClassRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PositionRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StressScenario = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarginAlert = any;

// ── Formatting helpers ──

function fmtUsd(n: number | null | undefined): string {
  if (n == null) return '-';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return `${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtSigned(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${fmtUsd(n)}`;
}

// ── Color helpers ──

function utilizationColor(pct: number | null | undefined): string {
  if (pct == null) return '#71717a';
  if (pct > 80) return '#ef4444';
  if (pct > 50) return '#eab308';
  return '#22c55e';
}

function utilizationClass(pct: number | null | undefined): string {
  if (pct == null) return 'text-zinc-500';
  if (pct > 80) return 'text-red-400';
  if (pct > 50) return 'text-yellow-400';
  return 'text-green-400';
}

function pnlColor(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function alertSeverityStyle(severity: string): { text: string; bg: string; border: string } {
  const s = (severity || '').toLowerCase();
  if (s === 'critical' || s === 'high')
    return { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' };
  if (s === 'warning' || s === 'medium')
    return { text: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' };
  return { text: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' };
}

// ── Text sparkline (30-day utilization) ──

function textSparkline(values: number[] | null | undefined): string {
  if (!values || values.length === 0) return '';
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => blocks[Math.min(Math.floor(((v - min) / range) * 7), 7)]).join('');
}

// ── Main Panel ──

export function PortfolioMarginPanel() {
  const t = useT();
  const { data, isLoading, error } = usePortfolioMargin();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="3" width="14" height="10" stroke="#34d399" strokeWidth="0.8" fill="none" opacity="0.6" />
            <line x1="1" y1="7" x2="15" y2="7" stroke="#34d399" strokeWidth="0.5" opacity="0.3" />
            <rect x="3" y="5" width="2" height="4" fill="#34d399" opacity="0.7" />
            <rect x="7" y="4" width="2" height="5" fill="#34d399" opacity="0.85" />
            <rect x="11" y="6" width="2" height="3" fill="#34d399" opacity="0.55" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {tr(t, 'panelPortfolioMargin', 'Portfolio Margin Analytics')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            Failed to load portfolio margin data
          </div>
        )}

        {data && (
          <>
            <SummaryCards data={data} t={t} />
            <AssetClassBreakdown rows={data?.assetClassBreakdown} t={t} />
            <PositionMargins rows={data?.positions} t={t} />
            <StressTestSection scenarios={data?.stressScenarios} t={t} />
            <HistoricalUtilization values={data?.historicalUtilization} current={data?.summary?.utilization} t={t} />
            <MarginAlerts alerts={data?.alerts} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Summary Cards ──

function SummaryCards({ data, t }: { data: PortfolioMarginData; t: ReturnType<typeof useT> }) {
  const s = data?.summary;
  if (!s) return null;

  const cards = [
    { label: 'Portfolio Value', value: fmtUsd(s.portfolioValue), color: '#e4e4e7' },
    { label: 'Initial Margin', value: fmtUsd(s.initialMargin), color: '#34d399' },
    { label: 'Maint. Margin', value: fmtUsd(s.maintenanceMargin), color: '#34d399' },
    { label: 'Excess Margin', value: fmtUsd(s.excessMargin), color: s.excessMargin < 0 ? '#ef4444' : '#22c55e' },
    { label: 'Utilization', value: fmtPct(s.utilization), color: utilizationColor(s.utilization) },
    { label: 'Buying Power', value: fmtUsd(s.buyingPower), color: '#a78bfa' },
  ];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmSummary', 'Margin Summary')}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {cards.map((c) => (
          <div
            key={c.label}
            className="px-1.5 py-1 border border-border/20 hover:bg-emerald-400/[0.02] transition-colors"
          >
            <div className="text-[6px] font-mono text-neutral-600 uppercase truncate">{c.label}</div>
            <div
              className="text-[9px] font-mono font-black tabular-nums mt-0.5"
              style={{ color: c.color }}
            >
              {c.value}
            </div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="mt-1.5 px-1">
        <div className="h-[3px] w-full bg-neutral-900 relative">
          <div
            className="h-full transition-all"
            style={{
              width: `${Math.min(s.utilization ?? 0, 100)}%`,
              backgroundColor: utilizationColor(s.utilization),
            }}
          />
          {/* 50% and 80% markers */}
          <div className="absolute top-0 left-[50%] w-[1px] h-[3px] bg-yellow-400/40" />
          <div className="absolute top-0 left-[80%] w-[1px] h-[3px] bg-red-400/40" />
        </div>
      </div>
    </div>
  );
}

// ── 2. Asset Class Breakdown ──

function AssetClassBreakdown({ rows, t }: { rows: AssetClassRow[] | undefined; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const totalNotional = rows.reduce((sum: number, r: AssetClassRow) => sum + (r.notional ?? 0), 0) || 1;

  // Palette per asset class
  const barColors = ['#34d399', '#22d3ee', '#a78bfa', '#fb923c', '#f472b6', '#facc15', '#60a5fa'];

  const headers = ['Asset Class', 'Notional', 'Margin Req', 'Rate', '% of Total'];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmAssetBreakdown', 'Asset Class Breakdown')}
      </div>

      {/* Stacked horizontal bar */}
      <div className="mx-1 mb-2 h-[6px] flex overflow-hidden bg-neutral-900">
        {rows.map((r: AssetClassRow, i: number) => {
          const pct = ((r.notional ?? 0) / totalNotional) * 100;
          return (
            <div
              key={r.assetClass ?? i}
              className="h-full"
              style={{
                width: `${pct}%`,
                backgroundColor: barColors[i % barColors.length],
                opacity: 0.75,
              }}
              title={`${r.assetClass}: ${fmtPct(pct, 1)}`}
            />
          );
        })}
      </div>

      {/* Legend chips */}
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 mx-1 mb-1.5">
        {rows.map((r: AssetClassRow, i: number) => (
          <div key={r.assetClass ?? i} className="flex items-center gap-1">
            <div className="w-[6px] h-[6px]" style={{ backgroundColor: barColors[i % barColors.length] }} />
            <span className="text-[7px] font-mono text-neutral-500">{r.assetClass}</span>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_60px_44px_50px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Table rows */}
      {rows.map((row: AssetClassRow, i: number) => {
        const pctOfTotal = ((row.notional ?? 0) / totalNotional) * 100;
        return (
          <div
            key={row.assetClass ?? i}
            className="grid grid-cols-[1fr_60px_60px_44px_50px] gap-0.5 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-emerald-400 truncate">{row.assetClass}</span>
            <span className="text-white tabular-nums">{fmtUsd(row.notional)}</span>
            <span className="text-neutral-300 tabular-nums">{fmtUsd(row.marginRequired)}</span>
            <span className="text-neutral-400 tabular-nums">{fmtPct(row.rate, 1)}</span>
            <span className="text-neutral-400 tabular-nums">{fmtPct(pctOfTotal, 1)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Position-Level Margins ──

function PositionMargins({ rows, t }: { rows: PositionRow[] | undefined; t: ReturnType<typeof useT> }) {
  if (!rows || rows.length === 0) return null;

  const headers = ['Symbol', 'Qty', 'Mkt Value', 'Margin Req', 'Rate', 'Risk Wt'];

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmPositionMargins', 'Position-Level Margins')}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_44px_56px_56px_40px_40px] gap-0.5 px-1 mb-0.5">
        {headers.map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase">
            {h}
          </span>
        ))}
      </div>

      {/* Scrollable rows */}
      <div className="max-h-[180px] overflow-y-auto no-scrollbar">
        {rows.map((row: PositionRow, i: number) => (
          <div
            key={row.symbol ?? i}
            className="grid grid-cols-[1fr_44px_56px_56px_40px_40px] gap-0.5 px-1 py-[3px] hover:bg-emerald-400/[0.02] border-b border-border/10 items-center text-[9px] font-mono"
          >
            <span className="text-[8px] font-bold text-emerald-400 truncate">{row.symbol}</span>
            <span className="text-neutral-300 tabular-nums text-right">
              {row.quantity != null ? fmtNum(row.quantity, 0) : '-'}
            </span>
            <span className="text-white tabular-nums text-right">{fmtUsd(row.marketValue)}</span>
            <span className="text-neutral-300 tabular-nums text-right">{fmtUsd(row.marginRequired)}</span>
            <span className="text-neutral-400 tabular-nums text-right">{fmtPct(row.rate, 1)}</span>
            <span
              className="tabular-nums text-right"
              style={{ color: (row.riskWeight ?? 0) > 1 ? '#ef4444' : '#71717a' }}
            >
              {fmtNum(row.riskWeight)}
            </span>
          </div>
        ))}
      </div>

      <div className="px-1 mt-1">
        <span className="text-[7px] font-mono text-neutral-600">
          {rows.length} position{rows.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

// ── 4. Stress Test Section ──

function StressTestSection({ scenarios, t }: { scenarios: StressScenario[] | undefined; t: ReturnType<typeof useT> }) {
  if (!scenarios || scenarios.length === 0) return null;

  // Show up to 5 scenarios in columns
  const display = scenarios.slice(0, 5);

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmStressTest', 'Stress Test Scenarios')}
      </div>

      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${display.length}, 1fr)` }}>
        {display.map((s: StressScenario, i: number) => {
          const isMarginCall = s.marginCall === true || s.marginCallTriggered === true;
          return (
            <div
              key={s.name ?? i}
              className={`px-1.5 py-1.5 border hover:bg-emerald-400/[0.02] transition-colors ${
                isMarginCall ? 'border-red-400/40 bg-red-400/[0.03]' : 'border-border/20'
              }`}
            >
              <div className="text-[7px] font-mono font-black text-neutral-400 uppercase truncate mb-1">
                {s.name}
              </div>
              <div
                className="text-[10px] font-mono font-black tabular-nums"
                style={{ color: pnlColor(s.pnlImpact) }}
              >
                {fmtSigned(s.pnlImpact)}
              </div>
              <div className="text-[7px] font-mono text-neutral-600 tabular-nums mt-0.5">
                {fmtPct(s.pnlImpactPct)}
              </div>
              {isMarginCall && (
                <div className="mt-1 text-[6px] font-mono font-black uppercase tracking-wider text-red-400 bg-red-400/10 px-1 py-[1px] inline-block">
                  Margin Call
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 5. Historical Utilization (30-day text sparkline) ──

function HistoricalUtilization({
  values,
  current,
  t,
}: {
  values: number[] | undefined;
  current: number | undefined;
  t: ReturnType<typeof useT>;
}) {
  if (!values || values.length === 0) return null;

  const spark = textSparkline(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div className="px-2 py-2 border-b border-border/20">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmHistUtil', 'Utilization 30D')}
      </div>

      <div className="px-1">
        <div className={`text-[10px] font-mono tracking-tight leading-none ${utilizationClass(current)}`}>
          {spark}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-[7px] font-mono text-neutral-600">
            Min <span className="text-neutral-400">{fmtPct(min, 1)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Avg <span className="text-neutral-400">{fmtPct(avg, 1)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Max <span className="text-neutral-400">{fmtPct(max, 1)}</span>
          </span>
          <span className="text-[7px] font-mono text-neutral-600">
            Now <span className={utilizationClass(current)}>{fmtPct(current)}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ── 6. Margin Alerts ──

function MarginAlerts({ alerts, t }: { alerts: MarginAlert[] | undefined; t: ReturnType<typeof useT> }) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="px-2 py-2">
      <div className="text-[7px] font-black uppercase tracking-widest text-neutral-500 mb-1.5 px-1">
        {tr(t, 'pmAlerts', 'Margin Alerts')}
      </div>

      <div className="flex flex-col gap-0.5 px-1">
        {alerts.map((alert: MarginAlert, i: number) => {
          const style = alertSeverityStyle(alert.severity);
          return (
            <div
              key={i}
              className={`flex items-start gap-1.5 px-1.5 py-1 border ${style.border} ${style.bg} hover:bg-emerald-400/[0.02] transition-colors`}
            >
              <span className={`text-[6px] font-mono font-black uppercase shrink-0 mt-[1px] ${style.text}`}>
                {alert.severity}
              </span>
              <span className="text-[8px] font-mono text-neutral-300 leading-tight">
                {alert.message}
              </span>
              {alert.timestamp && (
                <span className="text-[6px] font-mono text-neutral-600 shrink-0 ml-auto">
                  {alert.timestamp}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
