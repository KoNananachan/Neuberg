import { useSystematicStrategy } from '../../api/hooks/use-systematic-strategy';
import { useT } from '../../i18n';

// ── i18n fallback helper ──

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Constants ──

const ACCENT = '#a78bfa'; // violet-400

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

function returnColor(v: number | null | undefined): string {
  if (v == null) return '#71717a';
  return v > 0 ? '#22c55e' : v < 0 ? '#ef4444' : '#71717a';
}

function signalBg(v: number | null | undefined): string {
  if (v == null) return 'transparent';
  if (v > 0.5) return 'rgba(34,197,94,0.15)';
  if (v > 0) return 'rgba(34,197,94,0.08)';
  if (v < -0.5) return 'rgba(239,68,68,0.15)';
  if (v < 0) return 'rgba(239,68,68,0.08)';
  return 'rgba(113,113,122,0.08)';
}

function signalText(v: number | null | undefined): string {
  if (v == null) return '#71717a';
  if (v > 0) return '#22c55e';
  if (v < 0) return '#ef4444';
  return '#71717a';
}

// ── Main Panel ──

export function SystematicStrategyPanel() {
  const t = useT();
  const { data, isLoading } = useSystematicStrategy();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="w-0.5 h-3 shrink-0" style={{ backgroundColor: ACCENT }} />
        <span
          className="text-[9px] font-mono font-black uppercase tracking-wider"
          style={{ color: ACCENT }}
        >
          {tr(t, 'panelSystematicStrategy', 'SYSTEMATIC STRATEGY')}
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
            <StrategyPerformanceTable data={data} t={t} />
            <SignalDashboardTable data={data} t={t} />
            <FactorReturnsTable data={data} t={t} />
            <RiskMetricsSection data={data} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── 1. Strategy Performance ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StrategyPerformanceTable({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.strategyPerformance;
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysStrategyPerformance', 'Strategy Performance')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_40px_44px_40px] gap-0 px-3 py-1 border-b border-border/20">
        {['Strategy', '1D', '1W', '1M', 'YTD', '1Y', 'Sharpe', 'Max DD', 'Win%'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => (
        <div
          key={`${row.name}-${i}`}
          className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_40px_44px_40px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
            {row.name as string}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.return1D as number) }}
          >
            {fmtPct(row.return1D as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.return1W as number) }}
          >
            {fmtPct(row.return1W as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.return1M as number) }}
          >
            {fmtPct(row.return1M as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.returnYTD as number) }}
          >
            {fmtPct(row.returnYTD as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.return1Y as number) }}
          >
            {fmtPct(row.return1Y as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: (row.sharpe as number) > 1 ? '#22c55e' : (row.sharpe as number) < 0 ? '#ef4444' : '#a1a1aa' }}
          >
            {fmtNum(row.sharpe as number, 1)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-red-400/80">
            {fmtPct(row.maxDD as number)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-neutral-300">
            {(row.winRate as number) != null ? `${((row.winRate as number) * 100).toFixed(0)}%` : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 2. Signal Dashboard ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SignalDashboardTable({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.signalDashboard;
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysSignalDashboard', 'Signal Dashboard')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_50px_50px_56px_44px_54px] gap-0 px-3 py-1 border-b border-border/20">
        {['Asset', 'Trend', 'Momentum', 'Mean Rev', 'Carry', 'Composite'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => (
        <div
          key={`${row.asset}-${i}`}
          className="grid grid-cols-[1fr_50px_50px_56px_44px_54px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
            {row.asset as string}
          </span>
          <SignalCell value={row.trend as number} />
          <SignalCell value={row.momentum as number} />
          <SignalCell value={row.meanReversion as number} />
          <SignalCell value={row.carry as number} />
          <SignalCell value={row.composite as number} composite />
        </div>
      ))}
    </div>
  );
}

// ── Signal Cell ──

function SignalCell({ value, composite }: { value: number | null | undefined; composite?: boolean }) {
  if (value == null) {
    return <span className="text-[8px] font-mono text-right text-neutral-600">--</span>;
  }

  return (
    <div className="flex justify-end">
      <span
        className={`text-[7px] font-mono font-bold tabular-nums px-1 py-[1px] ${composite ? 'text-[8px]' : ''}`}
        style={{
          color: signalText(value),
          backgroundColor: signalBg(value),
        }}
      >
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

// ── 3. Factor Returns ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function FactorReturnsTable({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const rows = data?.factorReturns;
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysFactorReturns', 'Factor Returns')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_52px_52px_44px] gap-0 px-3 py-1 border-b border-border/20">
        {['Factor', 'MTD', 'QTD', 'YTD', 't-Stat'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold uppercase tracking-wider text-neutral-600 text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => (
        <div
          key={`${row.factor}-${i}`}
          className="grid grid-cols-[1fr_52px_52px_52px_44px] gap-0 px-3 py-[3px] border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
            {row.factor as string}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.mtd as number) }}
          >
            {fmtPct(row.mtd as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.qtd as number) }}
          >
            {fmtPct(row.qtd as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.ytd as number) }}
          >
            {fmtPct(row.ytd as number)}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{
              color: Math.abs(row.tStat as number) > 2
                ? '#a78bfa'
                : Math.abs(row.tStat as number) > 1
                  ? '#a1a1aa'
                  : '#71717a',
            }}
          >
            {fmtNum(row.tStat as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4. Risk Metrics ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskMetricsSection({ data, t }: { data: any; t: ReturnType<typeof useT> }) {
  const risk = data?.riskMetrics;
  if (!risk) return null;

  const metrics = [
    { label: 'VaR (95%)', value: fmtPct(risk.var95), color: '#ef4444' },
    { label: 'VaR (99%)', value: fmtPct(risk.var99), color: '#ef4444' },
    { label: 'CVaR (95%)', value: fmtPct(risk.cvar95), color: '#ef4444' },
    { label: 'CVaR (99%)', value: fmtPct(risk.cvar99), color: '#ef4444' },
    { label: 'Beta', value: fmtNum(risk.beta), color: '#a1a1aa' },
    { label: 'Equity Exp', value: fmtPct(risk.equityExposure), color: returnColor(risk.equityExposure) },
    { label: 'Rate Exp', value: fmtPct(risk.rateExposure), color: returnColor(risk.rateExposure) },
    { label: 'FX Exp', value: fmtPct(risk.fxExposure), color: returnColor(risk.fxExposure) },
    { label: 'Cmdty Exp', value: fmtPct(risk.commodityExposure), color: returnColor(risk.commodityExposure) },
    { label: 'Credit Exp', value: fmtPct(risk.creditExposure), color: returnColor(risk.creditExposure) },
    { label: 'Net Exp', value: fmtPct(risk.netExposure), color: returnColor(risk.netExposure) },
    { label: 'Gross Exp', value: fmtPct(risk.grossExposure), color: '#a1a1aa' },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/20">
        <span className="text-[8px] font-mono font-black uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysRiskMetrics', 'Risk Metrics')}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-0">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="flex items-center justify-between px-3 py-[3px] border-b border-border/20 hover:bg-violet-400/[0.02] transition-colors"
          >
            <span className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
              {m.label}
            </span>
            <span
              className="text-[8px] font-mono font-bold tabular-nums"
              style={{ color: m.color }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
