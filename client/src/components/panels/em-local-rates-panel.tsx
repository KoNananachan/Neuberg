import { useEmLocalRates } from '../../api/hooks/use-em-local-rates';
import { useT } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Formatting helpers ──

function fmtYield(n: number): string {
  return `${n.toFixed(2)}%`;
}

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtSpot(n: number): string {
  if (n >= 100) return n.toFixed(2);
  if (n >= 10) return n.toFixed(3);
  return n.toFixed(4);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}`;
}

function fmtZScore(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function yieldChangeColor(n: number): string {
  // For yields: rising = red (bearish for bonds), falling = green
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function carryColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function zscoreColor(n: number): string {
  if (n >= 2) return 'text-red-400';
  if (n >= 1) return 'text-yellow-400';
  if (n <= -2) return 'text-green-400';
  if (n <= -1) return 'text-blue-400';
  return 'text-neutral-400';
}

function attractivenessBadge(level: string): { text: string; bg: string } {
  const l = level.toLowerCase();
  if (l === 'attractive') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (l === 'unattractive') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

function directionBadge(dir: string): { text: string; bg: string } {
  const d = dir.toLowerCase();
  if (d === 'widening' || d === 'rising') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  if (d === 'narrowing' || d === 'falling') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

function flowTrendBadge(trend: string): { text: string; bg: string } {
  const t = trend.toLowerCase();
  if (t === 'inflows' || t === 'positive') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (t === 'outflows' || t === 'negative') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
}

// ── Main Panel ──

export function EmLocalRatesPanel() {
  const t = useT();
  const { data, isLoading, error } = useEmLocalRates();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-lime-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono">
          {tr(t, 'emlrError', 'Failed to load EM local rates')}
        </span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono text-[9px]">
      <div className="flex-1 overflow-y-auto">
        {/* Market Summary Bar */}
        <MarketSummaryBar summary={data.marketSummary} t={t} />

        {/* Local Currency Yields Table */}
        <LocalCurrencyYieldsTable yields={data.localCurrencyYields} t={t} />

        {/* NDF Forwards Table */}
        <NdfForwardsTable forwards={data.ndfForwards} t={t} />

        {/* Real Rate Comparison Table */}
        <RealRateComparisonTable comparisons={data.realRateComparison} t={t} />

        {/* Central Bank Spreads Table */}
        <CentralBankSpreadsTable spreads={data.centralBankSpreads} t={t} />
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: TFn }) {
  const flowStyle = flowTrendBadge(summary.flowTrend ?? '');

  return (
    <div className="grid grid-cols-6 border-b border-border/20">
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrAvgYield10y', 'Avg EM Yield 10Y')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtYield(summary.avgEMYield10y)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrAvgRealYield', 'Avg EM Real Yield')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtYield(summary.avgEMRealYield)}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrBestCarry', 'Best Carry')}
        </div>
        <div className="text-[10px] font-bold text-lime-400 truncate">
          {summary.bestCarry}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrWorstPerf', 'Worst Performer')}
        </div>
        <div className="text-[10px] font-bold text-red-400 truncate">
          {summary.worstPerformer}
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrEmbiSpread', 'EMBI Spread')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtBps(summary.embiSpread)} bps
        </div>
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'emlrFlowTrend', 'Flow Trend')}
        </div>
        <div className="mt-0.5">
          <span className={`px-1 py-px text-[7px] font-black font-mono uppercase border ${flowStyle.text} ${flowStyle.bg}`}>
            {summary.flowTrend}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Local Currency Yields Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LocalCurrencyYieldsTable({ yields, t }: { yields: any[]; t: TFn }) {
  if (!yields || yields.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'emlrLocalCurrencyYields', 'Local Currency Yields')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[72px_36px_48px_48px_44px_44px_44px_48px_44px_40px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'emlrCountry', 'Country')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'emlrCcy', 'CCY')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlr2Y', '2Y')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlr10Y', '10Y')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrSlope', 'Slope')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrChg10Y', 'Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrWkChg', '1W')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrReal10Y', 'Real')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrCPI', 'CPI')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'emlrRating', 'Rtg')}</span>
      </div>

      {/* Rows */}
      {yields.map((row: any, i: number) => (
        <div
          key={row.country ?? i}
          className="grid grid-cols-[72px_36px_48px_48px_44px_44px_44px_48px_44px_40px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{row.country}</span>
          <span className="text-[7px] font-mono text-neutral-400 text-center">{row.currency}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtRate(row.yield2y)}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtRate(row.yield10y)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${row.slope >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtBps(row.slope)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(row.change10y)}`}>
            {fmtChange(row.change10y)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${yieldChangeColor(row.weekChange)}`}>
            {fmtChange(row.weekChange)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${row.realYield10y >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmtRate(row.realYield10y)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(row.inflation)}</span>
          <span className="text-[7px] font-mono text-neutral-500 text-center">{row.rating}</span>
        </div>
      ))}
    </div>
  );
}

// ── NDF Forwards Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NdfForwardsTable({ forwards, t }: { forwards: any[]; t: TFn }) {
  if (!forwards || forwards.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'emlrNdfForwards', 'NDF Forwards')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[68px_56px_52px_52px_52px_52px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'emlrPair', 'Pair')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrSpot', 'Spot')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrNdf1m', '1M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrNdf3m', '3M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrNdf6m', '6M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrNdf12m', '12M')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrImpliedYld', 'Impl Yld')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrCarryUsd', 'Carry/USD')}</span>
      </div>

      {/* Rows */}
      {forwards.map((row: any, i: number) => (
        <div
          key={row.pair ?? i}
          className="grid grid-cols-[68px_56px_52px_52px_52px_52px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{row.pair}</span>
          <span className="text-[8px] font-mono text-white text-right">{fmtSpot(row.spot)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtSpot(row.ndf1m)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtSpot(row.ndf3m)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtSpot(row.ndf6m)}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtSpot(row.ndf12m)}</span>
          <span className="text-[8px] font-mono text-lime-400 text-right">{fmtYield(row.impliedYield)}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${carryColor(row.carryVsUSD)}`}>
            {fmtChange(row.carryVsUSD)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Real Rate Comparison Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RealRateComparisonTable({ comparisons, t }: { comparisons: any[]; t: TFn }) {
  if (!comparisons || comparisons.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'emlrRealRateComparison', 'Real Rate Comparison')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[72px_52px_44px_48px_52px_52px_52px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'emlrCountry', 'Country')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrNominal', 'Nominal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrCpiYoy', 'CPI')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrRealRate', 'Real')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrExAnte', 'Ex-Ante')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrCbRate', 'CB Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrRealPolicy', 'Real Pol')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'emlrAttract', 'Attractive')}</span>
      </div>

      {/* Rows */}
      {comparisons.map((row: any, i: number) => {
        const badge = attractivenessBadge(row.attractiveness ?? 'Fair');
        return (
          <div
            key={row.country ?? i}
            className="grid grid-cols-[72px_52px_44px_48px_52px_52px_52px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{row.country}</span>
            <span className="text-[8px] font-mono text-white text-right">{fmtRate(row.nominalRate)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(row.cpiYoY)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${row.realRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtRate(row.realRate)}
            </span>
            <span className={`text-[8px] font-mono text-right ${row.exAnteReal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtRate(row.exAnteReal)}
            </span>
            <span className="text-[8px] font-mono text-white text-right">{fmtRate(row.centralBankRate)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${row.realPolicyRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {fmtRate(row.realPolicyRate)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${badge.text} ${badge.bg}`}>
                {row.attractiveness}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Central Bank Spreads Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CentralBankSpreadsTable({ spreads, t }: { spreads: any[]; t: TFn }) {
  if (!spreads || spreads.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'emlrCentralBankSpreads', 'Central Bank Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[64px_48px_68px_48px_48px_52px_44px_60px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'emlrEmCountry', 'EM')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrEmRate', 'Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'emlrDmBenchmark', 'DM Bench')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrDmRate', 'DM Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrSpread', 'Spread')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrHistAvg', 'Hist Avg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'emlrZScore', 'Z')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'emlrDirection', 'Direction')}</span>
      </div>

      {/* Rows */}
      {spreads.map((row: any, i: number) => {
        const dirBadge = directionBadge(row.direction ?? 'Stable');
        return (
          <div
            key={row.emCountry ?? i}
            className="grid grid-cols-[64px_48px_68px_48px_48px_52px_44px_60px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{row.emCountry}</span>
            <span className="text-[8px] font-mono text-white text-right">{fmtRate(row.emRate)}</span>
            <span className="text-[7px] font-mono text-neutral-400 truncate">{row.dmBenchmark}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(row.dmRate)}</span>
            <span className="text-[8px] font-mono font-bold text-lime-400 text-right">{fmtBps(row.spread)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{fmtBps(row.historicalAvg)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${zscoreColor(row.zscore)}`}>
              {fmtZScore(row.zscore)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${dirBadge.text} ${dirBadge.bg}`}>
                {row.direction}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
