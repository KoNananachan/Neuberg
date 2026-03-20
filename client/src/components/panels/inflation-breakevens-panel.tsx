import { useInflationBreakevens } from '../../api/hooks/use-inflation-breakevens';
import { useT, tr, TFn } from '../../i18n';
import { Loader2 } from 'lucide-react';

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  return n.toFixed(3);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function trendSignalColor(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'rising' || s === 'bullish' || s === 'hawkish') return 'text-red-400';
  if (s === 'falling' || s === 'bearish' || s === 'dovish') return 'text-green-400';
  return 'text-yellow-400';
}

function trendSignalBg(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'rising' || s === 'bullish' || s === 'hawkish') return 'bg-red-500/10 border border-red-500/30';
  if (s === 'falling' || s === 'bearish' || s === 'dovish') return 'bg-green-500/10 border border-green-500/30';
  return 'bg-yellow-500/10 border border-yellow-500/30';
}

function surpriseColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── Main Panel ──

export function InflationBreakevensPanel() {
  const t = useT();
  const { data, isLoading, error } = useInflationBreakevens();

  if (isLoading && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-rose-400" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <span className="text-red-400 text-[9px] font-mono">
          {tr(t, 'ibError', 'Failed to load inflation breakevens')}
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

        {/* Breakeven Rates Table */}
        <BreakevenRatesTable breakevens={data.breakevens} t={t} />

        {/* Real Rates Table */}
        <RealRatesTable realRates={data.realRates} t={t} />

        {/* Inflation Swaps Table */}
        <InflationSwapsTable swaps={data.inflationSwaps} t={t} />

        {/* Global Comparison Table */}
        <GlobalComparisonTable comparisons={data.globalComparison} t={t} />
      </div>
    </div>
  );
}

// ── Market Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: TFn }) {
  return (
    <div className="grid grid-cols-5 border-b border-border/20">
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibUsBe10y', 'US BE 10Y')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.usBreakeven10y)}%
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibUsReal10y', 'US Real 10Y')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.usRealYield10y)}%
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibSwap5y5y', 'Swap 5Y5Y')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.inflationSwap5y5y)}%
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-border/20">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibTipsFv', 'TIPS Fair Value')}
        </div>
        <div className="text-[10px] font-bold text-white">
          {fmtRate(summary.tipsFairValue)}%
        </div>
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[7px] text-neutral-600 uppercase tracking-wider">
          {tr(t, 'ibTrend', 'Trend')}
        </div>
        <div className={`text-[9px] font-bold px-1 py-px inline-block ${trendSignalColor(summary.trendSignal)} ${trendSignalBg(summary.trendSignal)}`}>
          {summary.trendSignal.toUpperCase()}
        </div>
      </div>
    </div>
  );
}

// ── Breakeven Rates Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BreakevenRatesTable({ breakevens, t }: { breakevens: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
          {tr(t, 'ibBreakevenRates', 'Breakeven Rates')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_56px_52px_52px_52px_52px_56px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1W Ago</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1M Ago</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">1Y Ago</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">52W %ile</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Z-Score</span>
      </div>

      {/* Rows */}
      {breakevens.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[48px_56px_52px_52px_52px_52px_56px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.rate)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.weekAgo)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.monthAgo)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.yearAgo)}%</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.percentile52w)}</span>
          <span className={`text-[8px] font-bold text-right pr-1 ${changeColor(row.zScore)}`}>
            {row.zScore >= 0 ? '+' : ''}{row.zScore.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Real Rates Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RealRatesTable({ realRates, t }: { realRates: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
          {tr(t, 'ibRealRates', 'Real Rates')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_60px_60px_60px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Real Yld</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Nominal</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">1W Chg</span>
      </div>

      {/* Rows */}
      {realRates.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[48px_60px_60px_60px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.realYield)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.nominalYield)}%</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.breakeven)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className={`text-[8px] font-bold text-right pr-1 ${changeColor(row.weekChange)}`}>
            {fmtChange(row.weekChange)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Inflation Swaps Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InflationSwapsTable({ swaps, t }: { swaps: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
          {tr(t, 'ibInflationSwaps', 'Inflation Swaps')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_56px_52px_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Bid</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Ask</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Volume</span>
      </div>

      {/* Rows */}
      {swaps.map((row: any) => (
        <div
          key={row.tenor}
          className="grid grid-cols-[48px_56px_52px_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white">{row.tenor}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.rate)}%</span>
          <span className={`text-[8px] font-bold text-right ${changeColor(row.change)}`}>
            {fmtChange(row.change)}
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.bid)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtRate(row.ask)}%</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtBps(row.spread)} bp</span>
          <span className="text-[8px] text-neutral-400 text-right pr-1">{row.volume}</span>
        </div>
      ))}
    </div>
  );
}

// ── Global Comparison Table ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function GlobalComparisonTable({ comparisons, t }: { comparisons: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-2 py-1 border-b border-border/10">
        <span className="text-[8px] font-black uppercase tracking-wider text-rose-400">
          {tr(t, 'ibGlobalComparison', 'Global Comparison')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[64px_56px_52px_52px_52px_60px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">BE 10Y</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">CPI Fcst</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">CPI Act</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">Surprise</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right">CB Target</span>
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider text-right pr-1">Credib.</span>
      </div>

      {/* Rows */}
      {comparisons.map((row: any) => (
        <div
          key={row.country}
          className="grid grid-cols-[64px_56px_52px_52px_52px_60px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-rose-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-bold text-white truncate">{row.country}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtRate(row.breakeven10y)}%</span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.cpiForecast)}</span>
          <span className="text-[8px] text-neutral-300 text-right">{fmtPct(row.cpiActual)}</span>
          <span className={`text-[8px] font-bold text-right ${surpriseColor(row.surprise)}`}>
            {row.surprise >= 0 ? '+' : ''}{row.surprise.toFixed(2)}%
          </span>
          <span className="text-[8px] text-neutral-400 text-right">{fmtPct(row.centralBankTarget)}</span>
          <span className="text-[8px] text-neutral-300 text-right pr-1">{row.credibility}</span>
        </div>
      ))}
    </div>
  );
}
