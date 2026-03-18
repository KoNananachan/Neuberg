import { useSystematicStrategy } from '../../api/hooks/use-systematic-strategy';
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

const ACCENT = '#22d3ee'; // cyan-400

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtBillions(n: number | null | undefined): string {
  if (n == null) return '-';
  return `$${n.toFixed(1)}B`;
}

function returnColor(n: number | null | undefined): string {
  if (n == null) return '#71717a';
  if (n > 0) return '#22c55e';
  if (n < 0) return '#ef4444';
  return '#71717a';
}

function signalColor(v: number): { text: string; bg: string; intensity: number } {
  const abs = Math.abs(v);
  const intensity = Math.min(abs, 1);
  if (v > 0.05) return { text: '#22c55e', bg: `rgba(34,197,94,${0.08 + intensity * 0.25})`, intensity };
  if (v < -0.05) return { text: '#ef4444', bg: `rgba(239,68,68,${0.08 + intensity * 0.25})`, intensity };
  return { text: '#71717a', bg: 'rgba(113,113,122,0.08)', intensity };
}

function badgeClasses(variant: 'green' | 'red' | 'zinc'): string {
  switch (variant) {
    case 'green':
      return 'text-green-400 bg-green-400/15';
    case 'red':
      return 'text-red-400 bg-red-400/15';
    case 'zinc':
      return 'text-zinc-400 bg-zinc-400/10';
  }
}

function rebalanceBadgeVariant(signal: string): 'green' | 'red' | 'zinc' {
  const lower = (signal || '').toLowerCase();
  if (lower === 'increase') return 'green';
  if (lower === 'decrease') return 'red';
  return 'zinc';
}

function regimeBadgeVariant(regime: string): 'green' | 'red' | 'zinc' {
  const lower = (regime || '').toLowerCase();
  if (lower === 'favorable') return 'green';
  if (lower === 'unfavorable') return 'red';
  return 'zinc';
}

function positionBadgeVariant(position: string): 'green' | 'red' | 'zinc' {
  const lower = (position || '').toLowerCase();
  if (lower === 'long') return 'green';
  if (lower === 'short') return 'red';
  return 'zinc';
}

// ── Main Panel ──

export function SystematicStrategyPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useSystematicStrategy();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M2 14 L5 8 L8 10 L11 4 L14 2" stroke={ACCENT} strokeWidth="1.5" fill="none" opacity="0.8" />
            <circle cx="5" cy="8" r="1.2" fill={ACCENT} opacity="0.6" />
            <circle cx="8" cy="10" r="1.2" fill={ACCENT} opacity="0.6" />
            <circle cx="11" cy="4" r="1.2" fill={ACCENT} opacity="0.6" />
            <circle cx="14" cy="2" r="1.2" fill={ACCENT} />
          </svg>
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            {tr(t, 'systematicStrategyTitle', 'Systematic Strategy Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {isLoading && !data && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'systematicError', 'Failed to load data')}
          </div>
        )}

        {data && (
          <>
            <MarketSummaryBar summary={data.marketSummary} t={t} />
            <CTAPerformanceTable rows={data.ctaPerformance} t={t} />
            <RiskParityTable rows={data.riskParity} t={t} />
            <MacroFactorsTable rows={data.macroFactors} t={t} />
            <SignalDashboardTable rows={data.signalDashboard} t={t} />
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

  const trendVariant: 'green' | 'red' | 'zinc' =
    summary.trendFollowingExposure > 0 ? 'green' : summary.trendFollowingExposure < 0 ? 'red' : 'zinc';

  const metrics = [
    {
      label: 'Avg CTA Return',
      value: fmtPct(summary.avgCTAReturn),
      color: returnColor(summary.avgCTAReturn),
    },
    {
      label: 'Trend Exposure',
      value: summary.trendFollowingExposure != null
        ? `${summary.trendFollowingExposure > 0 ? '+' : ''}${summary.trendFollowingExposure.toFixed(0)}%`
        : '-',
      badge: true,
      badgeVariant: trendVariant,
    },
    {
      label: 'RP Leverage',
      value: summary.riskParityLeverage != null ? `${summary.riskParityLeverage.toFixed(2)}x` : '-',
    },
    {
      label: 'Macro Regime',
      value: summary.macroRegime || '-',
      color: summary.macroRegime?.toLowerCase() === 'risk-on' ? '#22c55e'
        : summary.macroRegime?.toLowerCase() === 'risk-off' ? '#ef4444' : '#a1a1aa',
    },
    {
      label: 'Active Signals',
      value: summary.activeSignals != null ? String(summary.activeSignals) : '-',
      color: ACCENT,
    },
    {
      label: 'Top Performer',
      value: summary.topPerformer || '-',
      color: '#22c55e',
    },
  ];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysMarketSummary', 'Market Summary')}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="flex items-center gap-1.5">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">{m.label}</span>
            {m.badge ? (
              <span className={`text-[8px] font-mono font-black px-1.5 py-[1px] ${badgeClasses(m.badgeVariant!)}`}>
                {m.value}
              </span>
            ) : (
              <span
                className="text-[9px] font-mono font-black tabular-nums"
                style={{ color: m.color || '#d4d4d8' }}
              >
                {m.value}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. CTA Performance Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CTAPerformanceTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysCTAPerformance', 'CTA Performance')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_36px_44px_44px_40px_44px] gap-0 px-3 py-1 border-b border-border/10">
        {['Strategy', 'MTD', 'YTD', '1Y', 'Sharpe', 'MaxDD', 'Vol', 'Corr', 'AUM'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => (
        <div
          key={`${row.strategy}-${i}`}
          className="grid grid-cols-[1fr_48px_48px_48px_36px_44px_44px_40px_44px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
            {row.strategy as string}
          </span>
          <span
            className="text-[8px] font-mono font-bold text-right tabular-nums"
            style={{ color: returnColor(row.returnMTD as number) }}
          >
            {fmtPct(row.returnMTD as number)}
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
          <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
            {fmtPct(row.volatility as number, 1)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
            {fmtNum(row.correlation as number)}
          </span>
          <span className="text-[8px] font-mono text-right tabular-nums text-cyan-400/80">
            {fmtBillions(row.aum as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 3. Risk Parity Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskParityTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysRiskParity', 'Risk Parity Allocation')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_44px_52px_52px_44px_44px_60px] gap-0 px-3 py-1 border-b border-border/10">
        {['Asset Class', 'Wt%', 'Risk Ctrb%', 'Ret Ctrb%', 'Vol', 'Lvg', 'Rebalance'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => {
        const rebalVar = rebalanceBadgeVariant(row.rebalanceSignal as string);
        return (
          <div
            key={`${row.assetClass}-${i}`}
            className="grid grid-cols-[1fr_44px_52px_52px_44px_44px_60px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.assetClass as string}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-300">
              {fmtNum(row.weight as number, 1)}%
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtNum(row.riskContribution as number, 1)}%
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: returnColor(row.returnContrib as number) }}
            >
              {fmtPct(row.returnContrib as number, 1)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtPct(row.volatility as number, 1)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-300">
              {fmtNum(row.leverage as number, 1)}x
            </span>
            <div className="flex justify-end">
              <span className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${badgeClasses(rebalVar)}`}>
                {(row.rebalanceSignal as string) || 'Hold'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Macro Factors Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MacroFactorsTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysMacroFactors', 'Macro Factor Exposures')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_42px_48px_36px_54px_48px] gap-0 px-3 py-1 border-b border-border/10">
        {['Factor', 'Current', 'Target', 'Active', 'MTD', 'Z', 'Regime', 'Signal'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => {
        const regimeVar = regimeBadgeVariant(row.regime as string);
        return (
          <div
            key={`${row.factor}-${i}`}
            className="grid grid-cols-[1fr_48px_48px_42px_48px_36px_54px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.factor as string}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-300">
              {fmtPct(row.currentExposure as number, 1)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtPct(row.targetExposure as number, 1)}
            </span>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-400">
              {fmtPct(row.activeRisk as number, 1)}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{ color: returnColor(row.returnMTD as number) }}
            >
              {fmtPct(row.returnMTD as number)}
            </span>
            <span
              className="text-[8px] font-mono font-bold text-right tabular-nums"
              style={{
                color: Math.abs(row.zscore as number) > 2
                  ? '#ef4444'
                  : Math.abs(row.zscore as number) > 1
                    ? '#fbbf24'
                    : '#71717a',
              }}
            >
              {fmtNum(row.zscore as number, 1)}
            </span>
            <div className="flex justify-end">
              <span className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${badgeClasses(regimeVar)}`}>
                {(row.regime as string) || 'Neutral'}
              </span>
            </div>
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400 truncate">
              {(row.signal as string) || '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Signal Dashboard Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SignalDashboardTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  if (!rows?.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'sysSignalDashboard', 'Signal Dashboard')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_46px_42px_42px_46px_50px_46px_38px] gap-0 px-3 py-1 border-b border-border/10">
        {['Asset', 'Trend', 'Carry', 'Value', 'Momentum', 'Composite', 'Position', 'Conf%'].map((h) => (
          <span key={h} className="text-[6px] font-mono font-bold text-neutral-600 uppercase text-right first:text-left">
            {h}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row: Record<string, unknown>, i: number) => {
        const posVar = positionBadgeVariant(row.position as string);
        return (
          <div
            key={`${row.asset}-${i}`}
            className="grid grid-cols-[1fr_46px_42px_42px_46px_50px_46px_38px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-cyan-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.asset as string}
            </span>
            <SignalCell value={row.trendSignal as number} />
            <SignalCell value={row.carrySignal as number} />
            <SignalCell value={row.valueSignal as number} />
            <SignalCell value={row.momentumSignal as number} />
            <SignalCell value={row.compositeSignal as number} composite />
            <div className="flex justify-end">
              <span className={`text-[7px] font-mono font-black uppercase px-1.5 py-[1px] ${badgeClasses(posVar)}`}>
                {(row.position as string) || 'Flat'}
              </span>
            </div>
            <span className="text-[8px] font-mono text-right tabular-nums text-neutral-300">
              {(row.confidence as number) != null ? `${(row.confidence as number).toFixed(0)}%` : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Signal Cell with colored bar ──

function SignalCell({ value, composite }: { value: number | null | undefined; composite?: boolean }) {
  if (value == null) {
    return <span className="text-[8px] font-mono text-right text-neutral-600">-</span>;
  }

  const { text } = signalColor(value);
  const clamped = Math.max(-1, Math.min(1, value));

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Mini bar */}
      <div className="relative w-[20px] h-[6px] bg-neutral-800/40 overflow-hidden">
        {clamped >= 0 ? (
          <div
            className="absolute left-1/2 top-0 h-full"
            style={{ width: `${Math.abs(clamped) * 50}%`, backgroundColor: text, opacity: 0.7 }}
          />
        ) : (
          <div
            className="absolute top-0 h-full"
            style={{
              right: '50%',
              width: `${Math.abs(clamped) * 50}%`,
              backgroundColor: text,
              opacity: 0.7,
            }}
          />
        )}
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-600/60" />
      </div>

      {/* Value */}
      <span
        className={`text-[7px] font-mono font-bold tabular-nums ${composite ? 'text-[8px]' : ''}`}
        style={{ color: text, minWidth: composite ? 28 : 22, textAlign: 'right' }}
      >
        {value > 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}
