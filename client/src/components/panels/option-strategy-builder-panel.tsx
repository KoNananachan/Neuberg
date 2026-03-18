import { useState, useMemo, useCallback } from 'react';
import { useOptionStrategyBuilder } from '../../api/hooks/use-option-strategy-builder';
import { useT } from '../../i18n';
import { Loader2 } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrategyData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StrategyLeg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GreeksData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VolScenario = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TimeDecayPoint = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MarketRegime = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PayoffPoint = any;

// ── Constants ──

const STRATEGIES = [
  'LONG_CALL',
  'LONG_PUT',
  'BULL_CALL_SPREAD',
  'BEAR_PUT_SPREAD',
  'LONG_STRADDLE',
  'LONG_STRANGLE',
  'IRON_CONDOR',
  'IRON_BUTTERFLY',
  'CALENDAR_SPREAD',
  'DIAGONAL_SPREAD',
  'COVERED_CALL',
  'PROTECTIVE_PUT',
] as const;

const STRATEGY_LABELS: Record<string, string> = {
  LONG_CALL: 'LONG CALL',
  LONG_PUT: 'LONG PUT',
  BULL_CALL_SPREAD: 'BULL CALL SPREAD',
  BEAR_PUT_SPREAD: 'BEAR PUT SPREAD',
  LONG_STRADDLE: 'LONG STRADDLE',
  LONG_STRANGLE: 'LONG STRANGLE',
  IRON_CONDOR: 'IRON CONDOR',
  IRON_BUTTERFLY: 'IRON BUTTERFLY',
  CALENDAR_SPREAD: 'CALENDAR SPREAD',
  DIAGONAL_SPREAD: 'DIAGONAL SPREAD',
  COVERED_CALL: 'COVERED CALL',
  PROTECTIVE_PUT: 'PROTECTIVE PUT',
};

// ── Helpers ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

function fmtMoney(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '--';
  return n < 0 ? `-$${Math.abs(n).toFixed(2)}` : `$${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '--';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function fmtGreek(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '--';
  return n.toFixed(4);
}

function pnlColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-400';
}

function regimeColor(regime: string | null | undefined): string {
  if (!regime) return 'text-neutral-400';
  const r = regime.toLowerCase();
  if (r === 'bullish' || r === 'low_vol') return 'text-green-400';
  if (r === 'bearish' || r === 'high_vol' || r === 'crisis') return 'text-red-400';
  if (r === 'neutral' || r === 'normal') return 'text-blue-400';
  if (r === 'volatile' || r === 'elevated') return 'text-yellow-400';
  return 'text-violet-400';
}

function regimeBg(regime: string | null | undefined): string {
  if (!regime) return 'bg-neutral-400/10';
  const r = regime.toLowerCase();
  if (r === 'bullish' || r === 'low_vol') return 'bg-green-400/10';
  if (r === 'bearish' || r === 'high_vol' || r === 'crisis') return 'bg-red-400/10';
  if (r === 'neutral' || r === 'normal') return 'bg-blue-400/10';
  if (r === 'volatile' || r === 'elevated') return 'bg-yellow-400/10';
  return 'bg-violet-400/10';
}

// ── ASCII Payoff Diagram ──

function AsciiPayoffChart({ payoffPoints }: { payoffPoints: PayoffPoint[] | null | undefined }) {
  const chart = useMemo(() => {
    if (!payoffPoints || payoffPoints.length < 3) return null;

    const ROWS = 15;
    const COLS = 60;

    const prices: number[] = payoffPoints.map((p: PayoffPoint) => p.price ?? p.underlyingPrice ?? 0);
    const pnls: number[] = payoffPoints.map((p: PayoffPoint) => p.pnl ?? p.payoff ?? 0);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minPnl = Math.min(...pnls);
    const maxPnl = Math.max(...pnls);
    const pnlRange = maxPnl - minPnl || 1;

    // Build grid
    const grid: string[][] = Array.from({ length: ROWS }, () =>
      Array.from({ length: COLS }, () => ' '),
    );

    // Plot zero line
    const zeroRow = Math.round(((maxPnl - 0) / pnlRange) * (ROWS - 1));
    if (zeroRow >= 0 && zeroRow < ROWS) {
      for (let c = 0; c < COLS; c++) {
        grid[zeroRow][c] = '\u2500';
      }
    }

    // Plot payoff curve
    for (let c = 0; c < COLS; c++) {
      const priceIdx = Math.round((c / (COLS - 1)) * (prices.length - 1));
      const pnl = pnls[priceIdx] ?? 0;
      const row = Math.round(((maxPnl - pnl) / pnlRange) * (ROWS - 1));
      if (row >= 0 && row < ROWS) {
        if (pnl > 0) grid[row][c] = '\u2588';
        else if (pnl < 0) grid[row][c] = '\u2593';
        else grid[row][c] = '\u254B';
      }
    }

    // Build output lines with Y-axis labels
    const lines: { label: string; row: string; pnlVal: number }[] = [];
    for (let r = 0; r < ROWS; r++) {
      const pnlVal = maxPnl - (r / (ROWS - 1)) * pnlRange;
      const label = pnlVal >= 0 ? `+${pnlVal.toFixed(0)}`.padStart(7) : `${pnlVal.toFixed(0)}`.padStart(7);
      lines.push({ label, row: grid[r].join(''), pnlVal });
    }

    return { lines, minPrice, maxPrice, zeroRow };
  }, [payoffPoints]);

  if (!chart) {
    return (
      <div className="text-[8px] font-mono text-neutral-600 uppercase text-center py-3">
        No payoff data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <pre className="text-[7px] leading-[10px] font-mono select-none">
        {chart.lines.map((line, i) => (
          <div key={i} className="flex">
            <span className="text-neutral-600 shrink-0">{line.label}</span>
            <span className="text-neutral-700 shrink-0"> {'\u2502'}</span>
            <span className={line.pnlVal > 0 ? 'text-green-500' : line.pnlVal < 0 ? 'text-red-500' : 'text-neutral-500'}>
              {line.row}
            </span>
          </div>
        ))}
        <div className="flex">
          <span className="text-neutral-600 shrink-0">{'       '}</span>
          <span className="text-neutral-700 shrink-0"> {'\u2514'}</span>
          <span className="text-neutral-600">{'\u2500'.repeat(60)}</span>
        </div>
        <div className="flex justify-between text-neutral-600 pl-[72px] pr-0">
          <span>{chart.minPrice.toFixed(0)}</span>
          <span>{((chart.minPrice + chart.maxPrice) / 2).toFixed(0)}</span>
          <span>{chart.maxPrice.toFixed(0)}</span>
        </div>
      </pre>
    </div>
  );
}

// ── Greeks Display ──

function GreeksDisplay({ greeks }: { greeks: GreeksData | null | undefined }) {
  const items = [
    { label: 'DELTA', value: greeks?.delta, color: 'text-blue-400', borderColor: 'border-blue-400/20' },
    { label: 'GAMMA', value: greeks?.gamma, color: 'text-purple-400', borderColor: 'border-purple-400/20' },
    { label: 'THETA', value: greeks?.theta, color: 'text-red-400', borderColor: 'border-red-400/20' },
    { label: 'VEGA', value: greeks?.vega, color: 'text-green-400', borderColor: 'border-green-400/20' },
  ];

  return (
    <div className="grid grid-cols-4 gap-px bg-border/10">
      {items.map((g) => (
        <div key={g.label} className={`bg-black px-2 py-1.5 border-t ${g.borderColor}`}>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">{g.label}</div>
          <div className={`text-[11px] font-black font-mono leading-none mt-0.5 ${g.color}`}>
            {fmtGreek(g.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Legs Table ──

function LegsTable({
  legs,
  tr,
}: {
  legs: StrategyLeg[] | null | undefined;
  tr: (key: string, fallback: string) => string;
}) {
  if (!legs || legs.length === 0) {
    return (
      <div className="text-[8px] font-mono text-neutral-600 uppercase text-center py-3">
        {tr('osbNoLegs', 'No legs configured')}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Header */}
      <div className="grid grid-cols-[48px_48px_44px_36px_60px] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider whitespace-nowrap bg-[#030303]">
        <span>STRIKE</span>
        <span className="text-center">TYPE</span>
        <span className="text-center">SIDE</span>
        <span className="text-right">QTY</span>
        <span className="text-right">PREMIUM</span>
      </div>

      {/* Rows */}
      {legs.map((leg: StrategyLeg, i: number) => (
        <div
          key={i}
          className="grid grid-cols-[48px_48px_44px_36px_60px] px-2 py-1.5 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors text-[9px] font-mono whitespace-nowrap"
        >
          <span className="text-violet-400 font-bold">{leg?.strike ?? '--'}</span>
          <span className={`text-center ${leg?.type?.toLowerCase() === 'call' ? 'text-green-400' : 'text-red-400'}`}>
            {(leg?.type ?? '--').toUpperCase()}
          </span>
          <span className={`text-center ${leg?.side?.toLowerCase() === 'buy' ? 'text-emerald-400' : 'text-orange-400'}`}>
            {(leg?.side ?? '--').toUpperCase()}
          </span>
          <span className="text-right text-neutral-400">{leg?.quantity ?? leg?.qty ?? '--'}</span>
          <span className="text-right text-neutral-300">{fmtMoney(leg?.premium)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Volatility Impact Table ──

function VolImpactTable({
  scenarios,
  tr,
}: {
  scenarios: VolScenario[] | null | undefined;
  tr: (key: string, fallback: string) => string;
}) {
  if (!scenarios || scenarios.length === 0) return null;

  return (
    <div>
      <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-2">
        {tr('osbVolImpact', 'IV SCENARIO ANALYSIS')}
      </div>
      <div className="overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[56px_56px_56px_64px] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider bg-[#030303]">
          <span>IV CHG</span>
          <span className="text-right">NEW IV</span>
          <span className="text-right">P&L</span>
          <span className="text-right">P&L %</span>
        </div>

        {scenarios.map((s: VolScenario, i: number) => (
          <div
            key={i}
            className="grid grid-cols-[56px_56px_56px_64px] px-2 py-1.5 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors text-[9px] font-mono"
          >
            <span className="text-neutral-400">{fmtPct(s?.ivChange)}</span>
            <span className="text-right text-neutral-300">{s?.newIV != null ? `${s.newIV.toFixed(1)}%` : '--'}</span>
            <span className={`text-right font-bold ${pnlColor(s?.pnl)}`}>{fmtMoney(s?.pnl)}</span>
            <span className={`text-right ${pnlColor(s?.pnlPercent ?? s?.pnlPct)}`}>
              {fmtPct(s?.pnlPercent ?? s?.pnlPct)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Time Decay Table ──

function TimeDecayTable({
  timeDecay,
  tr,
}: {
  timeDecay: TimeDecayPoint[] | null | undefined;
  tr: (key: string, fallback: string) => string;
}) {
  if (!timeDecay || timeDecay.length === 0) return null;

  return (
    <div>
      <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-2">
        {tr('osbTimeDecay', 'TIME DECAY PROGRESSION')}
      </div>
      <div className="overflow-x-auto">
        {/* Header */}
        <div className="grid grid-cols-[44px_52px_56px_64px] px-2 py-1 border-b border-border/20 text-[7px] font-black text-neutral-600 uppercase tracking-wider bg-[#030303]">
          <span>DTE</span>
          <span className="text-right">VALUE</span>
          <span className="text-right">P&L</span>
          <span className="text-right">THETA</span>
        </div>

        {timeDecay.map((pt: TimeDecayPoint, i: number) => {
          const dte = pt?.dte ?? pt?.daysToExpiry ?? '--';
          return (
            <div
              key={i}
              className="grid grid-cols-[44px_52px_56px_64px] px-2 py-1.5 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors text-[9px] font-mono"
            >
              <span className="text-neutral-400">T-{dte}</span>
              <span className="text-right text-neutral-300">{fmtMoney(pt?.value ?? pt?.price)}</span>
              <span className={`text-right font-bold ${pnlColor(pt?.pnl)}`}>{fmtMoney(pt?.pnl)}</span>
              <span className="text-right text-red-400/70">{fmtGreek(pt?.theta)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Market Regime Indicator ──

function MarketRegimeBar({
  regime,
  recommendedStrategies,
  tr,
}: {
  regime: MarketRegime | null | undefined;
  recommendedStrategies: string[] | null | undefined;
  tr: (key: string, fallback: string) => string;
}) {
  if (!regime && !recommendedStrategies) return null;

  const regimeLabel = regime?.label ?? regime?.name ?? regime ?? '--';
  const regimeStr = typeof regimeLabel === 'string' ? regimeLabel : String(regimeLabel);

  return (
    <div className="border-t border-border/20 px-2 py-2">
      <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5">
        {tr('osbMarketRegime', 'MARKET REGIME')}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`px-1.5 py-0.5 text-[8px] font-black font-mono uppercase tracking-wider border border-border/20 ${regimeColor(regimeStr)} ${regimeBg(regimeStr)}`}>
          {regimeStr.toUpperCase()}
        </span>
        {regime?.description && (
          <span className="text-[7px] font-mono text-neutral-600 truncate">{regime.description}</span>
        )}
      </div>

      {recommendedStrategies && recommendedStrategies.length > 0 && (
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
            {tr('osbRecommended', 'RECOMMENDED STRATEGIES')}
          </div>
          <div className="flex flex-wrap gap-1">
            {recommendedStrategies.map((s: string, i: number) => (
              <span
                key={i}
                className="px-1.5 py-0.5 text-[7px] font-mono font-bold text-violet-400 bg-violet-400/10 border border-violet-400/20 uppercase tracking-wider"
              >
                {STRATEGY_LABELS[s] ?? s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ──

export function OptionStrategyBuilderPanel() {
  const tr = useTr();
  const { data, isLoading, error } = useOptionStrategyBuilder();
  const [selectedStrategy, setSelectedStrategy] = useState<string>(STRATEGIES[0]);

  // Extract strategy-specific data
  const strategyData: StrategyData | null = useMemo(() => {
    if (!data) return null;
    // Support data.strategies as map or array
    if (data.strategies && typeof data.strategies === 'object') {
      if (Array.isArray(data.strategies)) {
        return data.strategies.find((s: StrategyData) => s?.id === selectedStrategy || s?.name === selectedStrategy) ?? data.strategies[0] ?? null;
      }
      return data.strategies[selectedStrategy] ?? null;
    }
    return data;
  }, [data, selectedStrategy]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load strategy data
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-[9px] font-mono overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
          {tr('panelOptionStrategyBuilder', 'OPTION STRATEGY BUILDER')}
        </span>
      </div>

      {/* Strategy Selector */}
      <div className="flex border-b border-border/20 shrink-0 overflow-x-auto no-scrollbar">
        {STRATEGIES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStrategy(s)}
            className={`shrink-0 px-2 py-1.5 text-[7px] font-mono font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
              selectedStrategy === s
                ? 'text-violet-400 border-b border-violet-400 bg-violet-400/5'
                : 'text-neutral-500 hover:text-neutral-400'
            }`}
          >
            {STRATEGY_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Strategy Summary */}
        <div className="px-3 py-2 border-b border-border/20">
          <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5">
            {STRATEGY_LABELS[selectedStrategy]}
          </div>

          <div className="grid grid-cols-4 gap-px bg-border/10">
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider">MAX PROFIT</div>
              <div className={`text-[11px] font-black leading-none mt-0.5 ${pnlColor(strategyData?.maxProfit)}`}>
                {strategyData?.maxProfit === Infinity || strategyData?.maxProfit === 'unlimited'
                  ? '\u221E'
                  : fmtMoney(strategyData?.maxProfit)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider">MAX LOSS</div>
              <div className="text-[11px] font-black leading-none mt-0.5 text-red-400">
                {strategyData?.maxLoss === -Infinity || strategyData?.maxLoss === 'unlimited'
                  ? '-\u221E'
                  : fmtMoney(strategyData?.maxLoss)}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider">BREAKEVEN</div>
              <div className="text-[11px] font-black leading-none mt-0.5 text-violet-400">
                {Array.isArray(strategyData?.breakevens)
                  ? strategyData.breakevens.map((b: number) => b?.toFixed?.(2) ?? '--').join(' / ')
                  : strategyData?.breakeven != null
                    ? Number(strategyData.breakeven).toFixed(2)
                    : '--'}
              </div>
            </div>
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] text-neutral-600 uppercase tracking-wider">PROB PROFIT</div>
              <div className="text-[11px] font-black leading-none mt-0.5 text-emerald-400">
                {strategyData?.probOfProfit != null
                  ? `${(strategyData.probOfProfit * 100).toFixed(1)}%`
                  : strategyData?.probProfit != null
                    ? `${strategyData.probProfit.toFixed(1)}%`
                    : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Legs Table */}
        <div className="border-b border-border/20 py-2">
          <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5 px-2">
            STRATEGY LEGS
          </div>
          <LegsTable legs={strategyData?.legs} tr={tr} />
        </div>

        {/* Payoff Diagram */}
        <div className="border-b border-border/20 px-2 py-2">
          <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5">
            PAYOFF AT EXPIRY
          </div>
          <AsciiPayoffChart payoffPoints={strategyData?.payoffDiagram ?? strategyData?.payoff ?? strategyData?.payoffPoints} />
        </div>

        {/* Greeks */}
        <div className="border-b border-border/20 py-2 px-2">
          <div className="text-[8px] font-black uppercase tracking-widest text-violet-400/70 mb-1.5">
            POSITION GREEKS
          </div>
          <GreeksDisplay greeks={strategyData?.greeks} />
        </div>

        {/* Volatility Impact */}
        <div className="border-b border-border/20 py-2">
          <VolImpactTable scenarios={strategyData?.volScenarios ?? strategyData?.volatilityImpact} tr={tr} />
        </div>

        {/* Time Decay */}
        <div className="border-b border-border/20 py-2">
          <TimeDecayTable timeDecay={strategyData?.timeDecay ?? strategyData?.timeDecayProgression} tr={tr} />
        </div>

        {/* Market Regime */}
        <MarketRegimeBar
          regime={data?.marketRegime ?? data?.regime}
          recommendedStrategies={data?.recommendedStrategies ?? data?.recommendations}
          tr={tr}
        />
      </div>
    </div>
  );
}
