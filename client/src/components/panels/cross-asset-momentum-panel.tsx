import { Loader2 } from 'lucide-react';
import { useCrossAssetMomentum } from '../../api/hooks/use-cross-asset-momentum';
import { useT } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = any;

// ── Color Helpers ──

function getReturnColor(n: number): string {
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function getMomentumColor(n: number): string {
  if (n >= 10) return 'text-emerald-300';
  if (n > 0) return 'text-emerald-400';
  if (n <= -10) return 'text-red-300';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function getOverallMomentumColor(regime: string): string {
  const r = regime.toLowerCase();
  if (r.includes('risk-on') || r.includes('risk on')) return 'text-emerald-400';
  if (r.includes('risk-off') || r.includes('risk off')) return 'text-red-400';
  if (r.includes('mixed')) return 'text-yellow-400';
  return 'text-neutral-400';
}

function getOverallMomentumBg(regime: string): string {
  const r = regime.toLowerCase();
  if (r.includes('risk-on') || r.includes('risk on')) return 'bg-emerald-400/10';
  if (r.includes('risk-off') || r.includes('risk off')) return 'bg-red-400/10';
  if (r.includes('mixed')) return 'bg-yellow-400/10';
  return 'bg-neutral-400/10';
}

function getSignalColor(signal: string): { text: string; bg: string } {
  const s = signal.toLowerCase();
  if (s === 'strong buy') return { text: 'text-emerald-300', bg: 'bg-emerald-400/15' };
  if (s === 'buy') return { text: 'text-green-400', bg: 'bg-green-400/15' };
  if (s === 'neutral') return { text: 'text-zinc-400', bg: 'bg-zinc-400/10' };
  if (s === 'sell') return { text: 'text-red-400', bg: 'bg-red-400/15' };
  if (s === 'strong sell') return { text: 'text-red-300', bg: 'bg-red-400/20' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
}

function getTrendScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-300';
  if (score >= 60) return 'text-emerald-400';
  if (score >= 40) return 'text-yellow-400';
  if (score >= 20) return 'text-orange-400';
  return 'text-red-400';
}

function getPairSignalColor(signal: string): { text: string; bg: string } {
  const s = signal.toLowerCase();
  if (s === 'enter') return { text: 'text-emerald-400', bg: 'bg-emerald-400/15' };
  if (s === 'hold') return { text: 'text-blue-400', bg: 'bg-blue-400/15' };
  if (s === 'exit') return { text: 'text-red-400', bg: 'bg-red-400/15' };
  if (s === 'monitor') return { text: 'text-yellow-400', bg: 'bg-yellow-400/15' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-400/10' };
}

function fmtPct(n: number): string {
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtScore(n: number): string {
  return n.toFixed(2);
}

function fmtPrice(n: number): string {
  return n.toLocaleString();
}

// ── Main Panel ──

export function CrossAssetMomentumPanel() {
  const { data, isLoading, error } = useCrossAssetMomentum();
  const _t = useT();

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
          Failed to load cross-asset momentum data
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {data.marketSummary && <MarketSummaryBar summary={data.marketSummary} />}
        {data.trendSignals?.length > 0 && <TrendSignalsTable rows={data.trendSignals} />}
        {data.momentumFactors?.length > 0 && <MomentumFactorsTable rows={data.momentumFactors} />}
        {data.meanReversionIndicators?.length > 0 && (
          <MeanReversionTable rows={data.meanReversionIndicators} />
        )}
        {data.pairStrategies?.length > 0 && <PairStrategiesTable rows={data.pairStrategies} />}
      </div>
    </div>
  );
}

// ── 1. Market Summary Bar ──

function MarketSummaryBar({ summary }: { summary: AnyData }) {
  return (
    <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      {/* Overall Momentum */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Momentum
        </span>
        <span
          className={`text-[9px] font-mono font-black uppercase px-1 py-[1px] inline-block w-fit ${getOverallMomentumColor(summary.overallMomentum)} ${getOverallMomentumBg(summary.overallMomentum)}`}
        >
          {summary.overallMomentum}
        </span>
      </div>

      {/* Trending Assets */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Trending
        </span>
        <span className="text-[9px] font-mono font-bold text-violet-400 tabular-nums">
          {summary.trendingAssets}
        </span>
      </div>

      {/* Mean-Reverting Assets */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Mean-Rev
        </span>
        <span className="text-[9px] font-mono font-bold text-violet-400 tabular-nums">
          {summary.meanRevertingAssets}
        </span>
      </div>

      {/* Avg Momentum Score */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Avg Score
        </span>
        <span className="text-[9px] font-mono font-bold text-neutral-300 tabular-nums">
          {fmtScore(summary.avgMomentumScore)}
        </span>
      </div>

      {/* Best Performer */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Best
        </span>
        <span className="text-[9px] font-mono font-bold text-emerald-400 truncate">
          {summary.bestPerformer}
        </span>
      </div>

      {/* Worst Performer */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">
          Worst
        </span>
        <span className="text-[9px] font-mono font-bold text-red-400 truncate">
          {summary.worstPerformer}
        </span>
      </div>
    </div>
  );
}

// ── 2. Trend Signals Table ──

function TrendSignalsTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-violet-400">
          Trend Signals
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_50px_52px_52px_52px_36px_52px_36px_36px_36px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Asset</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Class</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Price</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">SMA50</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">SMA200</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Score</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">1M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">3M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">12M</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const sig = getSignalColor(row.signal || '');
        return (
          <div
            key={row.asset || i}
            className="grid grid-cols-[1fr_50px_52px_52px_52px_36px_52px_36px_36px_36px] gap-0 px-2 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Asset */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.asset}
            </span>

            {/* Asset Class Badge */}
            <div className="flex justify-center">
              <span className="text-[6px] font-mono font-black uppercase px-1 py-[1px] bg-violet-400/10 text-violet-400">
                {row.assetClass}
              </span>
            </div>

            {/* Price */}
            <span className="text-[8px] font-mono font-bold text-neutral-300 text-right tabular-nums">
              {fmtPrice(row.price)}
            </span>

            {/* SMA50 */}
            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtPrice(row.sma50)}
            </span>

            {/* SMA200 */}
            <span className="text-[7px] font-mono text-neutral-400 text-right tabular-nums">
              {fmtPrice(row.sma200)}
            </span>

            {/* Trend Score */}
            <span
              className={`text-[7.5px] font-mono font-bold text-right tabular-nums ${getTrendScoreColor(row.trendScore)}`}
            >
              {fmtScore(row.trendScore)}
            </span>

            {/* Signal Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.bg} ${sig.text}`}
              >
                {row.signal}
              </span>
            </div>

            {/* Momentum 1M */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getMomentumColor(row.momentum1m)}`}
            >
              {fmtPct(row.momentum1m)}
            </span>

            {/* Momentum 3M */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getMomentumColor(row.momentum3m)}`}
            >
              {fmtPct(row.momentum3m)}
            </span>

            {/* Momentum 12M */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getMomentumColor(row.momentum12m)}`}
            >
              {fmtPct(row.momentum12m)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 3. Momentum Factors Table ──

function MomentumFactorsTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-violet-400">
          Momentum Factors
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_36px_40px_48px_36px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Factor</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Ret 1M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Ret 3M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Ret 12M</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Sharpe</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">MaxDD</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Exposure</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Z</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => (
        <div
          key={row.factor || i}
          className="grid grid-cols-[1fr_44px_44px_44px_36px_40px_48px_36px] gap-0 px-2 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
        >
          {/* Factor */}
          <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
            {row.factor}
          </span>

          {/* Return 1M */}
          <span
            className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.return1m)}`}
          >
            {fmtPct(row.return1m)}
          </span>

          {/* Return 3M */}
          <span
            className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.return3m)}`}
          >
            {fmtPct(row.return3m)}
          </span>

          {/* Return 12M */}
          <span
            className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.return12m)}`}
          >
            {fmtPct(row.return12m)}
          </span>

          {/* Sharpe */}
          <span className="text-[7px] font-mono font-bold text-right tabular-nums text-neutral-300">
            {fmtScore(row.sharpe)}
          </span>

          {/* Max Drawdown */}
          <span className="text-[7px] font-mono text-right tabular-nums text-red-400">
            {fmtPct(row.maxDD)}
          </span>

          {/* Current Exposure */}
          <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
            {fmtPct(row.currentExposure)}
          </span>

          {/* Z-Score */}
          <span
            className={`text-[7px] font-mono font-bold text-right tabular-nums ${row.zScore > 0 ? 'text-emerald-400' : row.zScore < 0 ? 'text-red-400' : 'text-neutral-500'}`}
          >
            {fmtScore(row.zScore)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── 4. Mean Reversion Indicators Table ──

function MeanReversionTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-violet-400">
          Mean Reversion Indicators
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_32px_42px_40px_48px_48px_48px_48px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Asset</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">RSI14</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Pctl%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Z 5Y</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Dist%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">MR Prob%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Exp Ret%</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Horizon</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const rsiColor =
          row.rsi14 >= 70
            ? 'text-red-400'
            : row.rsi14 <= 30
              ? 'text-emerald-400'
              : 'text-neutral-400';
        return (
          <div
            key={row.asset || i}
            className="grid grid-cols-[1fr_32px_42px_40px_48px_48px_48px_48px] gap-0 px-2 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Asset */}
            <span className="text-[8px] font-mono font-bold text-neutral-200 truncate">
              {row.asset}
            </span>

            {/* RSI14 */}
            <span className={`text-[7px] font-mono font-bold text-right tabular-nums ${rsiColor}`}>
              {fmtScore(row.rsi14)}
            </span>

            {/* Percentile Rank */}
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
              {fmtScore(row.percentileRank)}
            </span>

            {/* Z-Score 5Y */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${row.zScore5y > 0 ? 'text-emerald-400' : row.zScore5y < 0 ? 'text-red-400' : 'text-neutral-500'}`}
            >
              {fmtScore(row.zScore5y)}
            </span>

            {/* Distance From Mean */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.distanceFromMean)}`}
            >
              {fmtPct(row.distanceFromMean)}
            </span>

            {/* Mean Reversion Probability */}
            <span className="text-[7px] font-mono font-bold text-right tabular-nums text-violet-400">
              {fmtScore(row.meanReversionProb)}%
            </span>

            {/* Expected Return */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.expectedReturn)}`}
            >
              {fmtPct(row.expectedReturn)}
            </span>

            {/* Time Horizon */}
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
              {row.timeHorizon}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── 5. Pair Strategies Table ──

function PairStrategiesTable({ rows }: { rows: AnyData[] }) {
  return (
    <div className="border-b border-border/20">
      {/* Section Header */}
      <div className="px-3 py-1.5 bg-[#050505] border-b border-border/20">
        <span className="text-[7px] font-black font-mono uppercase tracking-widest text-violet-400">
          Pair Strategies
        </span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-[1fr_1fr_44px_40px_36px_36px_48px_44px] gap-0 px-2 py-1 border-b border-border/10">
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Long</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase">Short</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Spread</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Sprd Z</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">HLife</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">Corr</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-center">Signal</span>
        <span className="text-[6px] font-mono text-neutral-600 uppercase text-right">PnL MTD</span>
      </div>

      {/* Rows */}
      {rows.map((row: AnyData, i: number) => {
        const sig = getPairSignalColor(row.signal || '');
        return (
          <div
            key={`${row.longAsset}-${row.shortAsset}` || i}
            className="grid grid-cols-[1fr_1fr_44px_40px_36px_36px_48px_44px] gap-0 px-2 py-[3px] hover:bg-violet-400/[0.02] border-b border-border/10 items-center"
          >
            {/* Long Asset */}
            <span className="text-[8px] font-mono font-bold text-emerald-400 truncate">
              {row.longAsset}
            </span>

            {/* Short Asset */}
            <span className="text-[8px] font-mono font-bold text-red-400 truncate">
              {row.shortAsset}
            </span>

            {/* Spread */}
            <span className="text-[7px] font-mono font-bold text-right tabular-nums text-neutral-300">
              {fmtScore(row.spread)}
            </span>

            {/* Spread Z-Score */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${row.spreadZscore > 0 ? 'text-emerald-400' : row.spreadZscore < 0 ? 'text-red-400' : 'text-neutral-500'}`}
            >
              {fmtScore(row.spreadZscore)}
            </span>

            {/* Half Life */}
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
              {fmtScore(row.halfLife)}
            </span>

            {/* Correlation */}
            <span className="text-[7px] font-mono text-right tabular-nums text-neutral-400">
              {fmtScore(row.correlation)}
            </span>

            {/* Signal Badge */}
            <div className="flex justify-center">
              <span
                className={`text-[6px] font-mono font-black uppercase px-1 py-[1px] ${sig.bg} ${sig.text}`}
              >
                {row.signal}
              </span>
            </div>

            {/* PnL MTD */}
            <span
              className={`text-[7px] font-mono font-bold text-right tabular-nums ${getReturnColor(row.pnlMTD)}`}
            >
              {fmtPct(row.pnlMTD)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
