import { useMemo } from 'react';
import {
  useIrsMonitor,
  type IrsSwapRate,
  type IrsBasisSwap,
  type IrsSwapSpread,
  type IrsForwardRate,
  type IrsMonitorSummary,
} from '../../api/hooks/use-irs-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return n.toFixed(3);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtSpread(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers (bond convention: rates up = red, rates down = green) ──

function bpsColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function percentileColor(pct: number): string {
  if (pct >= 90) return 'text-red-400';
  if (pct >= 75) return 'text-yellow-400';
  if (pct <= 10) return 'text-green-400';
  if (pct <= 25) return 'text-sky-400';
  return 'text-neutral-400';
}

function percentileBar(pct: number): string {
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 75) return 'bg-yellow-400';
  if (pct <= 10) return 'bg-green-400';
  if (pct <= 25) return 'bg-sky-400';
  return 'bg-neutral-500';
}

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';
const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY'];

// ── Main Panel ──

export function IrsMonitorPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useIrsMonitor();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-sky-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-sky-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-sky-400">
            {tr(t, 'irsTitle', 'IRS Monitor')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'irsNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <SummaryBar summary={data.summary} t={t} />
            <SwapRatesSection rates={data.swapRates} t={t} />
            <BasisSwapsSection swaps={data.basisSwaps} t={t} />
            <SwapSpreadsSection spreads={data.swapSpreads} t={t} />
            <ForwardRatesSection forwards={data.forwardRates} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ── Summary Bar ──

function SummaryBar({
  summary,
  t,
}: {
  summary: IrsMonitorSummary;
  t: ReturnType<typeof useT>;
}) {
  const items = [
    { label: 'USD 10Y', value: summary.usd10y },
    { label: 'EUR 10Y', value: summary.eur10y },
    { label: 'GBP 10Y', value: summary.gbp10y },
    { label: 'JPY 10Y', value: summary.jpy10y },
  ];

  return (
    <div className="border-b border-sky-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-sky-400/10">
        {items.map((item) => (
          <div key={item.label} className="flex-1 px-2 py-1.5 text-center">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {item.label}
            </div>
            <div className="text-[10px] font-mono font-bold text-white">
              {fmtRate(item.value)}%
            </div>
          </div>
        ))}
        <div className="flex-1 px-2 py-1.5 text-center">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'irsAvgSpread', 'Avg Spread')}
          </div>
          <div className="text-[10px] font-mono font-bold text-sky-400">
            {fmtSpread(summary.avgSwapSpread)}bp
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Swap Rates Section (grouped by currency) ──

function SwapRatesSection({
  rates,
  t,
}: {
  rates: IrsSwapRate[];
  t: ReturnType<typeof useT>;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, IrsSwapRate[]>();
    for (const r of rates) {
      const arr = map.get(r.currency) ?? [];
      arr.push(r);
      map.set(r.currency, arr);
    }
    return map;
  }, [rates]);

  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'irsSwapRates', 'Swap Rate Curves')}
        </span>
      </div>

      {CURRENCIES.map((ccy) => {
        const ccyRates = grouped.get(ccy);
        if (!ccyRates || ccyRates.length === 0) return null;
        return (
          <div key={ccy}>
            {/* Currency sub-header */}
            <div className="px-3 py-0.5 bg-[#060606] border-b border-sky-400/5">
              <span className="text-[7px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                {ccy}
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[48px_60px_48px_48px_48px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'irsTenor', 'Tenor')}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
                {tr(t, 'irsFixed', 'Fixed %')}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
                {tr(t, 'irs1D', '\u03941D')}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
                {tr(t, 'irs1W', '\u03941W')}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
                {tr(t, 'irs1M', '\u03941M')}
              </span>
            </div>

            {/* Rows */}
            {ccyRates.map((rate) => (
              <SwapRateRow key={`${rate.currency}-${rate.tenor}`} rate={rate} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function SwapRateRow({ rate }: { rate: IrsSwapRate }) {
  return (
    <div className="grid grid-cols-[48px_60px_48px_48px_48px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-white">{rate.tenor}</span>
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {fmtRate(rate.fixedRate)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1d)}`}>
        {fmtBps(rate.change1d)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1w)}`}>
        {fmtBps(rate.change1w)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(rate.change1m)}`}>
        {fmtBps(rate.change1m)}
      </span>
    </div>
  );
}

// ── Basis Swaps Section ──

function BasisSwapsSection({
  swaps,
  t,
}: {
  swaps: IrsBasisSwap[];
  t: ReturnType<typeof useT>;
}) {
  if (swaps.length === 0) return null;

  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'irsBasisSwaps', 'Basis Swaps')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_48px_56px_48px_48px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsPair', 'Pair')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irs1D', '\u03941D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irs1W', '\u03941W')}
        </span>
      </div>

      {/* Rows */}
      {swaps.map((swap) => (
        <div
          key={`${swap.pair}-${swap.tenor}`}
          className="grid grid-cols-[72px_48px_56px_48px_48px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400">{swap.pair}</span>
          <span className="text-[8px] font-mono text-neutral-400">{swap.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtSpread(swap.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(swap.change1d)}`}>
            {fmtBps(swap.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${bpsColor(swap.change1w)}`}>
            {fmtBps(swap.change1w)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Swap Spreads Section (Treasury vs Swap with percentile) ──

function SwapSpreadsSection({
  spreads,
  t,
}: {
  spreads: IrsSwapSpread[];
  t: ReturnType<typeof useT>;
}) {
  if (spreads.length === 0) return null;

  return (
    <div className="border-b border-sky-400/30">
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'irsSwapSpreads', 'Swap Spreads vs Treasury')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_56px_56px_56px_48px_1fr] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsSwap', 'Swap')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsTsy', 'Tsy')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsPctl', '%ile')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">
          {tr(t, 'irsRange', 'Range')}
        </span>
      </div>

      {/* Rows */}
      {spreads.map((s) => (
        <SwapSpreadRow key={s.tenor} spread={s} />
      ))}
    </div>
  );
}

function SwapSpreadRow({ spread }: { spread: IrsSwapSpread }) {
  return (
    <div className="grid grid-cols-[48px_56px_56px_56px_48px_1fr] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center">
      <span className="text-[8px] font-mono font-bold text-white">{spread.tenor}</span>
      <span className="text-[8px] font-mono text-neutral-300 text-right">
        {fmtRate(spread.swapRate)}
      </span>
      <span className="text-[8px] font-mono text-neutral-300 text-right">
        {fmtRate(spread.treasuryYield)}
      </span>
      <span className="text-[8px] font-mono font-bold text-white text-right">
        {fmtSpread(spread.spread)}
      </span>
      <span className={`text-[8px] font-mono font-bold text-right ${percentileColor(spread.percentile)}`}>
        {spread.percentile}
      </span>
      <div className="flex items-center gap-1 justify-end pr-2">
        <div className="w-16 h-1.5 bg-neutral-800 relative">
          <div
            className={`absolute top-0 left-0 h-full ${percentileBar(spread.percentile)}`}
            style={{ width: `${Math.min(spread.percentile, 100)}%` }}
          />
          <div
            className="absolute top-[-1px] w-[2px] h-[8px] bg-white"
            style={{ left: `${Math.min(spread.percentile, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Forward Rates Section ──

function ForwardRatesSection({
  forwards,
  t,
}: {
  forwards: IrsForwardRate[];
  t: ReturnType<typeof useT>;
}) {
  if (forwards.length === 0) return null;

  return (
    <div>
      <div className="px-3 py-1 border-b border-sky-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'irsForwardRates', 'Forward Starting Swap Rates')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_48px_56px_56px_56px] gap-0 px-2 py-0.5 border-b border-sky-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsForward', 'Forward')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'irsTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsFwd', 'Fwd %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsSpot', 'Spot %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'irsCuts', 'Impl Cuts')}
        </span>
      </div>

      {/* Rows */}
      {forwards.map((fwd) => (
        <div
          key={`${fwd.label}-${fwd.tenor}`}
          className="grid grid-cols-[72px_48px_56px_56px_56px] gap-0 px-2 py-[3px] border-b border-sky-400/5 hover:bg-sky-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-sky-400">{fwd.label}</span>
          <span className="text-[8px] font-mono text-neutral-400">{fwd.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(fwd.forwardRate)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(fwd.spotRate)}
          </span>
          <span
            className={`text-[8px] font-mono font-bold text-right ${
              fwd.impliedCuts > 0
                ? 'text-green-400'
                : fwd.impliedCuts < 0
                  ? 'text-red-400'
                  : 'text-neutral-500'
            }`}
          >
            {fwd.impliedCuts > 0 ? '-' : fwd.impliedCuts < 0 ? '+' : ''}
            {Math.abs(fwd.impliedCuts).toFixed(0)}bp
          </span>
        </div>
      ))}
    </div>
  );
}
