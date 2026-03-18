import { Loader2 } from 'lucide-react';
import { useVolatilityArbitrage } from '../../api/hooks/use-volatility-arbitrage';
import { useT } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

// ── Color Helpers ──

function getZscoreColor(z: number): string {
  if (z >= 2) return 'text-emerald-300';
  if (z >= 1) return 'text-emerald-400';
  if (z <= -2) return 'text-red-300';
  if (z <= -1) return 'text-red-400';
  return 'text-neutral-400';
}

function getCorrSpreadColor(spread: number): string {
  if (spread >= 10) return 'text-emerald-300';
  if (spread >= 5) return 'text-emerald-400';
  if (spread <= -10) return 'text-red-300';
  if (spread <= -5) return 'text-red-400';
  return 'text-neutral-400';
}

function getSignalStyle(signal: string): { text: string; bg: string } {
  const s = signal.toLowerCase();
  if (s === 'strong buy' || s === 'buy calendar') return { text: 'text-emerald-300', bg: 'bg-emerald-400/15' };
  if (s === 'buy' || s === 'long') return { text: 'text-green-400', bg: 'bg-green-400/15' };
  if (s === 'sell' || s === 'short') return { text: 'text-red-400', bg: 'bg-red-400/15' };
  if (s === 'strong sell' || s === 'sell calendar') return { text: 'text-red-300', bg: 'bg-red-400/20' };
  if (s === 'buy dispersion') return { text: 'text-fuchsia-300', bg: 'bg-fuchsia-400/15' };
  if (s === 'sell dispersion') return { text: 'text-orange-400', bg: 'bg-orange-400/15' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
}

function getRegimeBadge(regime: string): { text: string; bg: string } {
  const r = regime.toLowerCase();
  if (r === 'low') return { text: 'text-green-400', bg: 'bg-green-400/10' };
  if (r === 'normal') return { text: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (r === 'elevated') return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
  if (r === 'crisis') return { text: 'text-red-400', bg: 'bg-red-400/15' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
}

function getVolRegimeHeaderStyle(regime: string): { text: string; bg: string } {
  const r = regime.toLowerCase();
  if (r === 'low' || r === 'low vol') return { text: 'text-green-400', bg: 'bg-green-400/10' };
  if (r === 'normal') return { text: 'text-blue-400', bg: 'bg-blue-400/10' };
  if (r === 'elevated') return { text: 'text-yellow-400', bg: 'bg-yellow-400/10' };
  if (r === 'crisis' || r === 'high vol') return { text: 'text-red-400', bg: 'bg-red-400/15' };
  return { text: 'text-fuchsia-400', bg: 'bg-fuchsia-400/10' };
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtNum(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

// ── Main Panel ──

export function VolatilityArbitragePanel() {
  const { data, isLoading, error } = useVolatilityArbitrage();
  const _t = useT();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          Failed to load volatility arbitrage data
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {data.marketSummary && <MarketSummaryBar summary={data.marketSummary} />}
        {data.volSurfaceArb?.length > 0 && <VolSurfaceArbTable rows={data.volSurfaceArb} />}
        {data.dispersionTrades?.length > 0 && <DispersionTradesTable rows={data.dispersionTrades} />}
        {data.correlationTrades?.length > 0 && <CorrelationTradesTable rows={data.correlationTrades} />}
        {data.volRegimeIndicators?.length > 0 && <VolRegimeTable rows={data.volRegimeIndicators} />}
      </div>
    </div>
  );
}

// ── 1. Market Summary Bar ──

function MarketSummaryBar({ summary }: { summary: AnyData }) {
  const regimeStyle = getVolRegimeHeaderStyle(summary.volRegime || '');

  return (
    <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      {/* VIX Level */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          VIX Level
        </span>
        <span className="text-[9px] font-mono font-bold text-fuchsia-400 tabular-nums">
          {fmtNum(summary.vixLevel)}
        </span>
      </div>

      {/* MOVE Level */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          MOVE Level
        </span>
        <span className="text-[9px] font-mono font-bold text-fuchsia-400 tabular-nums">
          {fmtNum(summary.moveLevel)}
        </span>
      </div>

      {/* Avg Implied Corr */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Avg Impl Corr
        </span>
        <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums">
          {fmtNum(summary.avgImpliedCorr)}
        </span>
      </div>

      {/* Dispersion Opportunities */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Dispersion Opps
        </span>
        <span className="text-[9px] font-mono font-bold text-fuchsia-400 tabular-nums">
          {summary.dispersionOpportunities}
        </span>
      </div>

      {/* Vol Regime */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Vol Regime
        </span>
        <span
          className={`text-[9px] font-mono font-black uppercase px-1 py-[1px] inline-block w-fit ${regimeStyle.text} ${regimeStyle.bg}`}
        >
          {summary.volRegime}
        </span>
      </div>

      {/* Dominant Strategy */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Strategy
        </span>
        <span className="text-[9px] font-mono font-bold text-neutral-200 truncate">
          {summary.dominantStrategy}
        </span>
      </div>
    </div>
  );
}

// ── 2. Vol Surface Arb Table ──

function VolSurfaceArbTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-fuchsia-400">
          Vol Surface Arbitrage
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_40px_48px_44px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Underlying</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">ATM 30d</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">ATM 90d</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Cal Spd</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Skew 25d</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">BFly</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Z-Score</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Exp P&L</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const sig = getSignalStyle(row.signal || '');
        return (
          <div
            key={row.underlying || i}
            className="grid grid-cols-[1fr_44px_44px_44px_44px_44px_40px_48px_44px] gap-0 px-2 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Underlying */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.underlying}
            </span>

            {/* ATM 30d IV */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {fmtNum(row.atm30dIV)}
            </span>

            {/* ATM 90d IV */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.atm90dIV)}
            </span>

            {/* Calendar Spread */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.calendarSpread)}
            </span>

            {/* Skew 25d */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.skew25d)}
            </span>

            {/* Butterfly Spread */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.butterflySpread)}
            </span>

            {/* Surface Z-Score */}
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getZscoreColor(row.surfaceZscore)}`}
            >
              {fmtNum(row.surfaceZscore)}
            </span>

            {/* Signal Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.bg} ${sig.text}`}
              >
                {row.signal}
              </span>
            </div>

            {/* Expected P&L */}
            <span className="text-[7.5px] font-mono font-bold text-right tabular-nums text-neutral-300">
              {fmtPct(row.expectedPnL)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Dispersion Trades Table ──

function DispersionTradesTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-fuchsia-400">
          Dispersion Trades
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_44px_44px_48px_48px_44px_48px_48px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Index</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Idx IV</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Avg Cmp</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Impl Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Real Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Disp PnL</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const sig = getSignalStyle(row.signal || '');
        return (
          <div
            key={row.index || i}
            className="grid grid-cols-[1fr_44px_44px_48px_48px_44px_48px_48px] gap-0 px-2 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Index */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.index}
            </span>

            {/* Index IV */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {fmtNum(row.indexIV)}
            </span>

            {/* Avg Component IV */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.avgComponentIV)}
            </span>

            {/* Implied Correlation */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.impliedCorrelation)}
            </span>

            {/* Realized Correlation */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.realizedCorrelation)}
            </span>

            {/* Correlation Spread */}
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getCorrSpreadColor(row.corrSpread)}`}
            >
              {fmtNum(row.corrSpread)}
            </span>

            {/* Dispersion P&L */}
            <span className="text-[7.5px] font-mono font-bold text-right tabular-nums text-neutral-300">
              {fmtPct(row.dispersionPnl)}
            </span>

            {/* Signal Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.bg} ${sig.text}`}
              >
                {row.signal}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 4. Correlation Trades Table ──

function CorrelationTradesTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-fuchsia-400">
          Correlation Trades
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_48px_48px_40px_40px_40px_48px_44px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Pair</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Impl Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Real Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Z-Score</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Half-L</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Position</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const sig = getSignalStyle(row.signal || '');
        return (
          <div
            key={row.pair || i}
            className="grid grid-cols-[1fr_48px_48px_40px_40px_40px_48px_44px] gap-0 px-2 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Pair */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.pair}
            </span>

            {/* Implied Correlation */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {fmtNum(row.impliedCorr)}
            </span>

            {/* Realized Correlation */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.realizedCorr)}
            </span>

            {/* Spread */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.spread)}
            </span>

            {/* Z-Score */}
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getZscoreColor(row.zscore)}`}
            >
              {fmtNum(row.zscore)}
            </span>

            {/* Half-Life */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.halfLife, 0)}d
            </span>

            {/* Signal Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.bg} ${sig.text}`}
              >
                {row.signal}
              </span>
            </div>

            {/* Position */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-300 text-right truncate">
              {row.position}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Vol Regime Indicators Table ──

function VolRegimeTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-fuchsia-400">
          Vol Regime Indicators
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_48px_44px_44px_52px_40px_40px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Indicator</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Current</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">%ile 20d</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">%ile 252d</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Regime</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Trend</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Z-Score</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const regime = getRegimeBadge(row.regime || '');
        return (
          <div
            key={row.indicator || i}
            className="grid grid-cols-[1fr_48px_44px_44px_52px_40px_40px] gap-0 px-2 py-[3px] hover:bg-fuchsia-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Indicator */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.indicator}
            </span>

            {/* Current Level */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {fmtNum(row.currentLevel)}
            </span>

            {/* Percentile 20d */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.percentile20d, 0)}
            </span>

            {/* Percentile 252d */}
            <span className="text-[7.5px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtNum(row.percentile252d, 0)}
            </span>

            {/* Regime Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${regime.bg} ${regime.text}`}
              >
                {row.regime}
              </span>
            </div>

            {/* Trend */}
            <span className="text-[7.5px] font-mono font-bold text-neutral-400 text-right truncate">
              {row.trend}
            </span>

            {/* Z-Score */}
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getZscoreColor(row.zscore)}`}
            >
              {fmtNum(row.zscore)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
