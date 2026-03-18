import { Loader2 } from 'lucide-react';
import { useBondRelativeValue } from '../../api/hooks/use-bond-relative-value';
import { useT } from '../../i18n';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtYield(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtZscore(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtPnl(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}bp`;
}

// -- Color helpers --

function richCheapColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n < 0) return 'text-red-400';
  if (n > 0) return 'text-green-400';
  return 'text-neutral-500';
}

function zscoreColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (Math.abs(n) >= 2) return n > 0 ? 'text-green-400' : 'text-red-400';
  if (Math.abs(n) >= 1) return n > 0 ? 'text-green-400/70' : 'text-red-400/70';
  return 'text-neutral-400';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function pnlColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function signalBadge(signal: string | null | undefined): { text: string; bg: string } {
  const s = (signal ?? '').toLowerCase();
  if (s === 'buy' || s === 'long') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'sell' || s === 'short') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s === 'strong buy') return { text: 'text-green-400', bg: 'bg-green-500/15 border-green-500/40' };
  if (s === 'strong sell') return { text: 'text-red-400', bg: 'bg-red-500/15 border-red-500/40' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
}

function liquidityBadge(liq: string | null | undefined): { text: string; bg: string } {
  const l = (liq ?? '').toLowerCase();
  if (l === 'high' || l === 'excellent') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (l === 'low' || l === 'poor') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
}

function directionBadge(dir: string | null | undefined): { text: string; bg: string } {
  const d = (dir ?? '').toLowerCase();
  if (d === 'widening' || d === 'up') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (d === 'tightening' || d === 'down') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
}

function convictionBadge(conv: string | null | undefined): { text: string; bg: string } {
  const c = (conv ?? '').toLowerCase();
  if (c === 'high') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (c === 'medium') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

// -- Main Panel --

export function BondRelativeValuePanel() {
  const t = useT();
  const { data, isLoading, error } = useBondRelativeValue();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          {tr(t, 'brvError', 'Failed to load bond relative value data')}
        </div>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const richCheap: any[] = data.richCheap ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const butterflyTrades: any[] = data.butterflyTrades ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swapSpreads: any[] = data.swapSpreads ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curveTrades: any[] = data.curveTrades ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summary: any = data.marketSummary ?? {};

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Market Summary Bar */}
        <MarketSummaryBar summary={summary} t={t} />

        {/* Rich/Cheap Analysis */}
        {richCheap.length > 0 && <RichCheapTable rows={richCheap} t={t} />}

        {/* Butterfly Trades */}
        {butterflyTrades.length > 0 && <ButterflyTable rows={butterflyTrades} t={t} />}

        {/* Swap Spreads */}
        {swapSpreads.length > 0 && <SwapSpreadsTable rows={swapSpreads} t={t} />}

        {/* Curve Trades */}
        {curveTrades.length > 0 && <CurveTradesTable rows={curveTrades} t={t} />}
      </div>
    </div>
  );
}

// -- Section 1: Market Summary Bar --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MarketSummaryBar({ summary, t }: { summary: any; t: ReturnType<typeof useT> }) {
  const metrics = [
    {
      label: tr(t, 'brvAvgRCZ', 'Avg R/C Z-Score'),
      value: fmtZscore(summary.avgRichCheapZscore),
      color: zscoreColor(summary.avgRichCheapZscore),
    },
    {
      label: tr(t, 'brvMostRich', 'Most Rich'),
      value: summary.mostRich ?? '-',
      color: 'text-red-400',
    },
    {
      label: tr(t, 'brvMostCheap', 'Most Cheap'),
      value: summary.mostCheap ?? '-',
      color: 'text-green-400',
    },
    {
      label: tr(t, 'brvBflyAvgZ', 'Bfly Avg Z'),
      value: fmtZscore(summary.butterflyAvgZscore),
      color: zscoreColor(summary.butterflyAvgZscore),
    },
    {
      label: tr(t, 'brvSwapTrend', 'Swap Spread Trend'),
      value: summary.swapSpreadTrend ?? '-',
      color: (summary.swapSpreadTrend ?? '').toLowerCase() === 'tightening'
        ? 'text-green-400'
        : (summary.swapSpreadTrend ?? '').toLowerCase() === 'widening'
          ? 'text-red-400'
          : 'text-yellow-400',
    },
    {
      label: tr(t, 'brvTheme', 'Dominant Theme'),
      value: summary.dominantTheme ?? '-',
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-6 gap-0 border-b border-border/20 px-3 py-2 shrink-0">
      {metrics.map((m) => (
        <div key={m.label}>
          <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider">{m.label}</div>
          <div className={`text-[11px] font-mono font-black truncate ${m.color}`}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

// -- Section 2: Rich/Cheap Analysis --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RichCheapTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'brvRichCheap', 'Rich/Cheap Analysis')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_56px_56px_48px_48px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'brvSecurity', 'Security')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvYield', 'Yield')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvSpread', 'Spread')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvRC', 'R/C')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvZscore', 'Z-Score')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvPctile', '%ile')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'brvLiq', 'Liq')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'brvSignal', 'Signal')}</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const sig = signalBadge(row.signal);
        const liq = liquidityBadge(row.liquidity);
        return (
          <div
            key={row.security ?? i}
            className="grid grid-cols-[1fr_56px_56px_56px_48px_48px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{row.security ?? '-'}</span>
            <span className="text-[8px] font-mono text-white text-right">{fmtYield(row.yield)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtSpread(row.spread)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${richCheapColor(row.richCheap)}`}>
              {fmtBps(row.richCheap)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${zscoreColor(row.zscore)}`}>
              {fmtZscore(row.zscore)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(row.percentile)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${liq.text} ${liq.bg}`}>
                {row.liquidity ?? '-'}
              </span>
            </div>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal ?? '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Section 3: Butterfly Trades --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ButterflyTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'brvButterfly', 'Butterfly Trades')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_52px_48px_52px_56px_56px_48px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'brvName', 'Name')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvShort', 'Short')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvBelly', 'Belly')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvLong', 'Long')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvCurrent', 'Current')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvHistAvg', 'Hist Avg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvZscore', 'Z-Score')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'brvSignal', 'Signal')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvPnl30', 'PnL 30D')}</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const sig = signalBadge(row.signal);
        return (
          <div
            key={row.name ?? i}
            className="grid grid-cols-[1fr_52px_48px_52px_56px_56px_48px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{row.name ?? '-'}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{row.shortWing ?? '-'}</span>
            <span className="text-[8px] font-mono text-blue-400 text-right">{row.belly ?? '-'}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{row.longWing ?? '-'}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtBps(row.currentSpread)}</span>
            <span className="text-[8px] font-mono text-neutral-500 text-right">{fmtBps(row.historicalAvg)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${zscoreColor(row.zscore)}`}>
              {fmtZscore(row.zscore)}
            </span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal ?? '-'}
              </span>
            </div>
            <span className={`text-[8px] font-mono font-bold text-right ${pnlColor(row.pnl30d)}`}>
              {fmtPnl(row.pnl30d)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// -- Section 4: Swap Spreads --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SwapSpreadsTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'brvSwapSpreads', 'Swap Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[52px_60px_60px_56px_48px_48px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'brvTenor', 'Tenor')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvGovt', 'Govt Yld')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvSwap', 'Swap Rate')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvSwpSprd', 'Sprd')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvChg', 'Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvWkChg', '1W Chg')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvPctile', '%ile')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'brvDir', 'Dir')}</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const dir = directionBadge(row.direction);
        return (
          <div
            key={row.tenor ?? i}
            className="grid grid-cols-[52px_60px_60px_56px_48px_48px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtYield(row.govtYield)}</span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtYield(row.swapRate)}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtSpread(row.swapSpread)}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.change)}`}>
              {fmtBps(row.change)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(row.weekChange)}`}>
              {fmtBps(row.weekChange)}
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtPct(row.percentile)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${dir.text} ${dir.bg}`}>
                {row.direction ?? '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -- Section 5: Curve Trades --

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CurveTradesTable({ rows, t }: { rows: any[]; t: ReturnType<typeof useT> }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'brvCurveTrades', 'Curve Trades')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_60px_52px_52px_52px_48px_48px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'brvTrade', 'Trade')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvCurrent', 'Current')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvTarget', 'Target')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvStop', 'Stop')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-center">{tr(t, 'brvConv', 'Conv')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvCarry', 'Carry')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'brvRoll', 'Roll')}</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const conv = convictionBadge(row.conviction);
        return (
          <div
            key={row.trade ?? i}
            className="grid grid-cols-[1fr_60px_52px_52px_52px_48px_48px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-blue-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{row.trade ?? '-'}</span>
            <span className="text-[8px] font-mono font-bold text-white text-right">{fmtBps(row.currentSpread)}</span>
            <span className="text-[8px] font-mono text-blue-400 text-right">{fmtBps(row.target)}</span>
            <span className="text-[8px] font-mono text-red-400/70 text-right">{fmtBps(row.stopLoss)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${conv.text} ${conv.bg}`}>
                {row.conviction ?? '-'}
              </span>
            </div>
            <span className="text-[8px] font-mono text-green-400/70 text-right">{fmtBps(row.carry)}</span>
            <span className="text-[8px] font-mono text-green-400/70 text-right">{fmtBps(row.rolldown)}</span>
          </div>
        );
      })}
    </div>
  );
}
