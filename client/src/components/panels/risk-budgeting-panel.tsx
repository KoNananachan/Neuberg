import { useMemo } from 'react';
import { useRiskBudgeting } from '../../api/hooks/use-risk-budgeting';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Local types (hook does not export types) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RiskBudgetingData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrategyBudget = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RiskFactor = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BreachAlert = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StressScenario = any;

// ── Helpers ──

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '-';
  return n.toFixed(decimals);
}

function fmtDollar(n: number | null | undefined): string {
  if (n == null) return '-';
  const sign = n >= 0 ? '' : '-';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function utilizationColor(pct: number): string {
  if (pct >= 95) return '#ef4444';   // red
  if (pct >= 80) return '#f59e0b';   // amber
  if (pct >= 60) return '#eab308';   // yellow
  return '#22c55e';                  // green
}

function severityBadge(severity: string): { text: string; bg: string; fg: string } {
  const s = (severity || '').toLowerCase();
  if (s === 'critical') return { text: 'CRIT', bg: 'bg-red-400/15', fg: 'text-red-400' };
  return { text: 'WARN', bg: 'bg-amber-400/15', fg: 'text-amber-400' };
}

function statusBadge(status: string): { text: string; bg: string; fg: string } {
  const s = (status || '').toLowerCase();
  if (s === 'resolved') return { text: 'RESOLVED', bg: 'bg-emerald-400/10', fg: 'text-emerald-400' };
  if (s === 'acknowledged') return { text: 'ACK', bg: 'bg-cyan-400/10', fg: 'text-cyan-400' };
  return { text: 'OPEN', bg: 'bg-red-400/10', fg: 'text-red-400' };
}

// Text sparkline: map 30 values to block characters
function textSparkline(values: number[] | null | undefined): string {
  if (!values || values.length === 0) return '';
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (blocks.length - 1));
      return blocks[Math.min(idx, blocks.length - 1)];
    })
    .join('');
}

// ── Main Panel ──

export function RiskBudgetingPanel() {
  const t = useT();
  const { data, isLoading, error } = useRiskBudgeting();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" stroke="#f87171" strokeWidth="1" fill="none" opacity="0.5" />
            <rect x="4" y="4" width="8" height="8" stroke="#f87171" strokeWidth="0.8" fill="none" opacity="0.3" />
            <line x1="2" y1="8" x2="14" y2="8" stroke="#f87171" strokeWidth="0.5" opacity="0.3" />
            <line x1="8" y1="2" x2="8" y2="14" stroke="#f87171" strokeWidth="0.5" opacity="0.3" />
            <circle cx="8" cy="8" r="1.5" fill="#f87171" opacity="0.8" />
          </svg>
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-red-400">
            {tr(t, 'panelRiskBudgeting', 'Risk Budget Allocation')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {isLoading && (
            <span className="text-[7px] font-mono text-red-400/40 uppercase animate-pulse">LOADING</span>
          )}
          <RefreshCw className={`w-3 h-3 text-neutral-500 ${isLoading ? 'animate-spin' : ''}`} />
        </div>
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/50 uppercase tracking-widest animate-pulse">
            LOADING RISK BUDGETS...
          </span>
        </div>
      ) : error && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400/60 uppercase tracking-widest">
            FAILED TO LOAD
          </span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto no-scrollbar">
          <OverviewCards data={data} />
          <StrategyBudgetsTable data={data} />
          <RiskFactorDecomposition data={data} />
          <BreachAlerts data={data} />
          <HistoricalUtilization data={data} />
          <StressTestGrid data={data} />
        </div>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          RISK BUDGET
        </span>
        <span className="text-[7px] font-mono text-neutral-700">
          {data?.updatedAt
            ? new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : ''}
        </span>
      </div>
    </div>
  );
}

// ── 1. Overview Cards ──

function OverviewCards({ data }: { data: RiskBudgetingData }) {
  const overview = data?.overview;
  const utilPct = overview?.utilizationPct ?? 0;
  const utilColor = utilizationColor(utilPct);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 mb-2">
        VAR BUDGET OVERVIEW
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {/* Total VaR Budget */}
        <div className="p-1.5 border border-border/20 bg-[#060606]">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">TOTAL VAR BUDGET</div>
          <div className="text-[11px] font-mono font-bold text-white mt-0.5">
            {fmtDollar(overview?.totalVarBudget)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {overview?.confidenceLevel ? `${overview.confidenceLevel} ${overview.horizon || '1D'}` : '95% 1D'}
          </div>
        </div>

        {/* Current Usage */}
        <div className="p-1.5 border border-border/20 bg-[#060606]">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">CURRENT USAGE</div>
          <div className="text-[11px] font-mono font-bold text-red-400 mt-0.5">
            {fmtDollar(overview?.currentUsage)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {overview?.changeFromYesterday != null
              ? `${overview.changeFromYesterday > 0 ? '+' : ''}${fmtDollar(overview.changeFromYesterday)} vs yday`
              : ''}
          </div>
        </div>

        {/* Remaining */}
        <div className="p-1.5 border border-border/20 bg-[#060606]">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">REMAINING</div>
          <div
            className="text-[11px] font-mono font-bold mt-0.5"
            style={{ color: (overview?.remaining ?? 0) < 0 ? '#ef4444' : '#22c55e' }}
          >
            {fmtDollar(overview?.remaining)}
          </div>
          <div className="text-[7px] font-mono text-neutral-600">
            {(overview?.remaining ?? 0) < 0 ? 'OVER BUDGET' : 'AVAILABLE'}
          </div>
        </div>

        {/* Utilization % with gauge */}
        <div className="p-1.5 border border-border/20 bg-[#060606]">
          <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">UTILIZATION</div>
          <div className="text-[11px] font-mono font-bold mt-0.5" style={{ color: utilColor }}>
            {fmtNum(utilPct, 1)}%
          </div>
          {/* Gauge bar */}
          <div className="h-1 bg-white/[0.04] mt-1 w-full">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(utilPct, 100)}%`,
                backgroundColor: utilColor,
                opacity: 0.7,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2. Strategy Budgets Table ──

function StrategyBudgetsTable({ data }: { data: RiskBudgetingData }) {
  const strategies: StrategyBudget[] = data?.strategies ?? [];

  if (!strategies.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600">
          STRATEGY BUDGETS
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.2fr_0.6fr_0.6fr_1fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">STRATEGY</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">ALLOC VAR</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">USED VAR</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">UTILIZATION</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">PNL YTD</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">SHARPE</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">IR</span>
      </div>

      {/* Rows */}
      {strategies.map((s: StrategyBudget, i: number) => {
        const utilPct = s?.utilizationPct ?? 0;
        const uColor = utilizationColor(utilPct);
        const pnlColor = (s?.pnlYtd ?? 0) >= 0 ? '#22c55e' : '#ef4444';

        return (
          <div
            key={s?.name || i}
            className="grid grid-cols-[1.2fr_0.6fr_0.6fr_1fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{s?.name}</div>
              {s?.desk && (
                <div className="text-[7px] font-mono text-neutral-600 truncate">{s.desk}</div>
              )}
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtDollar(s?.allocatedVar)}
            </span>
            <span className="text-[9px] font-mono text-right" style={{ color: uColor }}>
              {fmtDollar(s?.usedVar)}
            </span>
            {/* Utilization bar */}
            <div className="flex items-center gap-1.5 px-1">
              <div className="flex-1 h-1.5 bg-white/[0.04] relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(utilPct, 100)}%`,
                    backgroundColor: uColor,
                    opacity: 0.6,
                  }}
                />
              </div>
              <span className="text-[7px] font-mono font-bold w-[28px] text-right shrink-0" style={{ color: uColor }}>
                {fmtNum(utilPct, 0)}%
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold text-right" style={{ color: pnlColor }}>
              {fmtPct(s?.pnlYtd, 1)}
            </span>
            <span
              className="text-[9px] font-mono text-right"
              style={{ color: (s?.sharpe ?? 0) >= 1 ? '#22c55e' : (s?.sharpe ?? 0) >= 0 ? '#a1a1aa' : '#ef4444' }}
            >
              {fmtNum(s?.sharpe, 2)}
            </span>
            <span
              className="text-[9px] font-mono text-right"
              style={{ color: (s?.infoRatio ?? 0) >= 0.5 ? '#22c55e' : (s?.infoRatio ?? 0) >= 0 ? '#a1a1aa' : '#ef4444' }}
            >
              {fmtNum(s?.infoRatio, 2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Risk Factor Decomposition ──

function RiskFactorDecomposition({ data }: { data: RiskBudgetingData }) {
  const factors: RiskFactor[] = data?.riskFactors ?? [];

  const sorted = useMemo(
    () => [...factors].sort((a: RiskFactor, b: RiskFactor) => Math.abs(b?.marginalVarContribution ?? 0) - Math.abs(a?.marginalVarContribution ?? 0)),
    [factors],
  );

  if (!sorted.length) return null;

  const maxContrib = Math.max(...sorted.map((f: RiskFactor) => Math.abs(f?.pctOfTotal ?? 0)), 1);

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600">
          RISK FACTOR DECOMPOSITION
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_1fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">FACTOR</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">EXPOSURE</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">MARG VAR</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">% OF TOTAL</span>
      </div>

      {/* Rows */}
      {sorted.map((f: RiskFactor, i: number) => {
        const pctTotal = Math.abs(f?.pctOfTotal ?? 0);
        const barWidth = maxContrib > 0 ? (pctTotal / maxContrib) * 100 : 0;
        const isNeg = (f?.marginalVarContribution ?? 0) < 0;

        return (
          <div
            key={f?.factor || i}
            className="grid grid-cols-[1.2fr_0.7fr_0.7fr_1fr] px-3 py-1 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{f?.factor}</div>
              {f?.category && (
                <div className="text-[7px] font-mono text-neutral-600 truncate">{f.category}</div>
              )}
            </div>
            <span className="text-[9px] font-mono text-neutral-300 text-right">
              {fmtNum(f?.exposure, 3)}
            </span>
            <span
              className="text-[9px] font-mono font-bold text-right"
              style={{ color: isNeg ? '#3b82f6' : '#ef4444' }}
            >
              {fmtDollar(f?.marginalVarContribution)}
            </span>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-white/[0.04] relative">
                <div
                  className="absolute top-0 left-0 h-full"
                  style={{
                    width: `${Math.min(barWidth, 100)}%`,
                    backgroundColor: isNeg ? '#3b82f6' : '#f87171',
                    opacity: 0.5,
                  }}
                />
              </div>
              <span className="text-[7px] font-mono text-neutral-400 w-[28px] text-right shrink-0">
                {fmtNum(f?.pctOfTotal, 1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Breach Alerts ──

function BreachAlerts({ data }: { data: RiskBudgetingData }) {
  const alerts: BreachAlert[] = data?.breachAlerts ?? [];

  if (!alerts.length) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1.5 flex items-center gap-2">
        <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600">
          BREACH ALERTS
        </div>
        <span className="text-[7px] font-mono font-bold text-red-400 bg-red-400/10 px-1 py-0.5">
          {alerts.length}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[0.5fr_1.2fr_0.6fr_0.5fr_0.5fr_0.6fr] px-3 py-1 border-b border-border/20 bg-black/40">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">SEV</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">DESCRIPTION</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">STRATEGY</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">BREACH</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">STATUS</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">TIMESTAMP</span>
      </div>

      {/* Rows */}
      {alerts.map((a: BreachAlert, i: number) => {
        const sev = severityBadge(a?.severity);
        const stat = statusBadge(a?.status);

        return (
          <div
            key={a?.id || i}
            className="grid grid-cols-[0.5fr_1.2fr_0.6fr_0.5fr_0.5fr_0.6fr] px-3 py-1 border-b border-border/10 hover:bg-red-400/[0.02] transition-colors items-center"
          >
            <div>
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 ${sev.bg} ${sev.fg}`}>
                {sev.text}
              </span>
            </div>
            <div className="text-[9px] font-mono text-white truncate">{a?.description}</div>
            <div className="text-[8px] font-mono text-neutral-400 truncate">{a?.strategy}</div>
            <span className="text-[9px] font-mono font-bold text-red-400 text-right">
              {a?.breachPct != null ? `${fmtNum(a.breachPct, 0)}%` : fmtDollar(a?.breachAmount)}
            </span>
            <div className="flex justify-center">
              <span className={`text-[6px] font-black font-mono uppercase px-1 py-0.5 ${stat.bg} ${stat.fg}`}>
                {stat.text}
              </span>
            </div>
            <span className="text-[7px] font-mono text-neutral-600 text-right truncate">
              {a?.timestamp
                ? new Date(a.timestamp).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '-'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Historical VaR Utilization (30-day text sparkline) ──

function HistoricalUtilization({ data }: { data: RiskBudgetingData }) {
  const history = data?.historicalUtilization;

  if (!history?.values?.length) return null;

  const values: number[] = history.values;
  const sparkline = textSparkline(values);
  const latest = values[values.length - 1];
  const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 mb-2">
        30-DAY VAR UTILIZATION
      </div>

      {/* Sparkline */}
      <div
        className="text-[9px] font-mono leading-none tracking-tight"
        style={{ color: utilizationColor(latest ?? 0) }}
      >
        {sparkline}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-1.5">
        <div>
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">CURRENT </span>
          <span className="text-[8px] font-mono font-bold" style={{ color: utilizationColor(latest) }}>
            {fmtNum(latest, 1)}%
          </span>
        </div>
        <div>
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">AVG </span>
          <span className="text-[8px] font-mono text-neutral-300">{fmtNum(avg, 1)}%</span>
        </div>
        <div>
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">MAX </span>
          <span className="text-[8px] font-mono text-red-400">{fmtNum(max, 1)}%</span>
        </div>
        <div>
          <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">MIN </span>
          <span className="text-[8px] font-mono text-emerald-400">{fmtNum(min, 1)}%</span>
        </div>
        {history?.period && (
          <div>
            <span className="text-[6px] font-mono text-neutral-700 uppercase">{history.period}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 6. Stress Test Grid ──

function StressTestGrid({ data }: { data: RiskBudgetingData }) {
  const stressTest = data?.stressTest;
  const scenarios: StressScenario[] = stressTest?.scenarios ?? [];
  const strategies: string[] = stressTest?.strategies ?? [];

  // stressTest.grid[strategyIdx][scenarioIdx] = VaR impact value
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grid: any[][] = stressTest?.grid ?? [];

  if (!scenarios.length || !strategies.length || !grid.length) return null;

  // Find absolute max for color scaling
  const allValues = grid.flat().filter((v: unknown) => typeof v === 'number') as number[];
  const absMax = Math.max(...allValues.map(Math.abs), 1);

  return (
    <div className="px-3 py-2">
      <div className="text-[8px] font-black uppercase tracking-wider text-neutral-600 mb-2">
        STRESS TEST — VAR IMPACT BY SCENARIO
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-left py-1 pr-2 border-b border-border/20 sticky left-0 bg-black z-10">
                STRATEGY
              </th>
              {scenarios.map((s: StressScenario, i: number) => (
                <th
                  key={s?.name || i}
                  className="text-[6px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center py-1 px-1 border-b border-border/20 whitespace-nowrap"
                >
                  {s?.name || `S${i + 1}`}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strategies.map((stratName: string, si: number) => (
              <tr key={stratName} className="hover:bg-red-400/[0.02] transition-colors">
                <td className="text-[8px] font-mono font-bold text-white py-1 pr-2 border-b border-border/10 truncate max-w-[120px] sticky left-0 bg-black z-10">
                  {stratName}
                </td>
                {(grid[si] ?? []).map((val: number | null, ci: number) => {
                  const numVal = typeof val === 'number' ? val : 0;
                  const intensity = Math.min(Math.abs(numVal) / absMax, 1);
                  const isNeg = numVal < 0;
                  const bgColor = isNeg
                    ? `rgba(239,68,68,${0.03 + intensity * 0.25})`
                    : numVal > 0
                      ? `rgba(34,197,94,${0.03 + intensity * 0.2})`
                      : 'transparent';
                  const textColor = isNeg
                    ? `rgba(248,113,113,${0.5 + intensity * 0.5})`
                    : numVal > 0
                      ? `rgba(74,222,128,${0.5 + intensity * 0.5})`
                      : '#71717a';

                  return (
                    <td
                      key={ci}
                      className="text-[8px] font-mono font-bold text-center py-1 px-1 border-b border-border/10"
                      style={{ backgroundColor: bgColor, color: textColor }}
                    >
                      {val != null ? fmtPct(numVal, 1) : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
