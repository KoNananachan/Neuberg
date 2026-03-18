import { useInflationSwap } from '../../api/hooks/use-inflation-swap';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// -- i18n fallback helper --

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// -- Formatting helpers --

function fmtRate(n: number): string {
  return n.toFixed(2);
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number): string {
  return n.toFixed(2);
}

function fmtChange(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function fmtVol(n: number): string {
  return n.toFixed(1);
}

// -- Color helpers --

/** For inflation: rising = red, falling = green */
function changeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function inflationColor(n: number): string {
  if (n > 3.5) return 'text-red-400';
  if (n > 2.5) return 'text-yellow-400';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-blue-400';
  return 'text-neutral-500';
}

function flowColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function surpriseColor(n: number): string {
  if (n > 0.1) return 'text-red-400';
  if (n > 0) return 'text-yellow-400';
  if (n < -0.1) return 'text-green-400';
  if (n < 0) return 'text-teal-400';
  return 'text-neutral-500';
}

// -- Interfaces --

interface BreakevenRate {
  tenor: string;
  rate: number;
  change1d: number;
  change1w: number;
  high52w: number;
  low52w: number;
}

interface SwapRate {
  tenor: string;
  usd: number;
  eur: number;
  gbp: number;
  jpy: number;
}

interface RealYield {
  tenor: string;
  yield: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface ForwardExpectation {
  name: string;
  rate: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

interface CpiForecast {
  period: string;
  forecast: number;
  actual: number | null;
  surprise: number | null;
  consensus: number;
}

interface TipsFlow {
  fund: string;
  flow1w: number;
  flow1m: number;
  flow3m: number;
  aum: number;
}

interface GlobalInflation {
  country: string;
  cpi: number;
  core: number;
  target: number;
  swapRate5y: number;
  trend: string;
}

// -- Main Panel --

export function InflationSwapPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useInflationSwap();

  const d = data as any;

  const breakevens = d?.breakevens as BreakevenRate[] | undefined;
  const swapRates = d?.swapRates as SwapRate[] | undefined;
  const realYields = d?.realYields as RealYield[] | undefined;
  const forwardExpectations = d?.forwardExpectations as ForwardExpectation[] | undefined;
  const cpiForecasts = d?.cpiForecasts as CpiForecast[] | undefined;
  const tipsFlows = d?.tipsFlows as TipsFlow[] | undefined;
  const globalInflation = d?.globalInflation as GlobalInflation[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-orange-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-orange-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-orange-400">
            {tr(t, 'panelInflationSwap', 'Inflation Swap')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-orange-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-orange-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING...
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD
          </div>
        )}

        {!d && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {d && (
          <>
            {breakevens && breakevens.length > 0 && <BreakevenRatesSection rates={breakevens} />}
            {swapRates && swapRates.length > 0 && <SwapRatesGrid rates={swapRates} />}
            {realYields && realYields.length > 0 && <RealYieldsSection yields={realYields} />}
            {forwardExpectations && forwardExpectations.length > 0 && (
              <ForwardExpectationsSection expectations={forwardExpectations} />
            )}
            {cpiForecasts && cpiForecasts.length > 0 && <CpiForecastsSection forecasts={cpiForecasts} />}
            {tipsFlows && tipsFlows.length > 0 && <TipsFlowsSection flows={tipsFlows} />}
            {globalInflation && globalInflation.length > 0 && (
              <GlobalInflationSection countries={globalInflation} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// -- Breakeven Rates Section (2Y-30Y) --

function BreakevenRatesSection({ rates }: { rates: BreakevenRate[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Breakeven Rates
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_56px_44px_44px_44px_44px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">52W Hi</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">52W Lo</span>
      </div>

      {/* Rows */}
      {rates.map((r) => (
        <div
          key={r.tenor}
          className="grid grid-cols-[40px_56px_44px_44px_44px_44px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400">{r.tenor}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(r.rate)}`}>
            {fmtRate(r.rate)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1d)}`}>
            {fmtBps(r.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r.change1w)}`}>
            {fmtBps(r.change1w)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(r.high52w)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right pr-2">
            {fmtRate(r.low52w)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Inflation Swap Rates Grid by Currency --

function SwapRatesGrid({ rates }: { rates: SwapRate[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Inflation Swap Rates
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-mono text-orange-400 uppercase tracking-wider text-right font-bold">USD</span>
        <span className="text-[7px] font-mono text-orange-400 uppercase tracking-wider text-right font-bold">EUR</span>
        <span className="text-[7px] font-mono text-orange-400 uppercase tracking-wider text-right font-bold">GBP</span>
        <span className="text-[7px] font-mono text-orange-400 uppercase tracking-wider text-right font-bold pr-2">JPY</span>
      </div>

      {/* Rows */}
      {rates.map((r) => (
        <div
          key={r.tenor}
          className="grid grid-cols-[40px_1fr_1fr_1fr_1fr] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{r.tenor}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(r.usd)}`}>
            {fmtRate(r.usd)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(r.eur)}`}>
            {fmtRate(r.eur)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(r.gbp)}`}>
            {fmtRate(r.gbp)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${inflationColor(r.jpy)}`}>
            {fmtRate(r.jpy)}%
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Real Yields (TIPS) Section --

function RealYieldsSection({ yields }: { yields: RealYield[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Real Yields (TIPS)
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[40px_56px_44px_44px_44px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Yield</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">{'\u0394'}1M</span>
      </div>

      {/* Rows */}
      {yields.map((y) => (
        <div
          key={y.tenor}
          className="grid grid-cols-[40px_56px_44px_44px_44px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400">{y.tenor}</span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(y.yield)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(y.change1d)}`}>
            {fmtBps(y.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(y.change1w)}`}>
            {fmtBps(y.change1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(y.change1m)}`}>
            {fmtBps(y.change1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Forward Inflation Expectations (5y5y) --

function ForwardExpectationsSection({ expectations }: { expectations: ForwardExpectation[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Forward Inflation Expectations
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_44px_44px_44px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Measure</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Rate</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">{'\u0394'}1W</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">{'\u0394'}1M</span>
      </div>

      {/* Rows */}
      {expectations.map((e) => (
        <div
          key={e.name}
          className="grid grid-cols-[1fr_56px_44px_44px_44px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{e.name}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(e.rate)}`}>
            {fmtRate(e.rate)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(e.change1d)}`}>
            {fmtBps(e.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(e.change1w)}`}>
            {fmtBps(e.change1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${changeColor(e.change1m)}`}>
            {fmtBps(e.change1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- CPI Forecasts with Surprise History --

function CpiForecastsSection({ forecasts }: { forecasts: CpiForecast[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CPI Forecasts
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_52px_52px_52px_52px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Period</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Forecast</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Actual</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Consensus</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">Surprise</span>
      </div>

      {/* Rows */}
      {forecasts.map((f) => (
        <div
          key={f.period}
          className="grid grid-cols-[56px_52px_52px_52px_52px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{f.period}</span>
          <span className="text-[8px] font-mono font-bold text-right text-orange-400">
            {fmtPct(f.forecast)}%
          </span>
          <span className="text-[8px] font-mono font-bold text-right text-white">
            {f.actual !== null ? `${fmtPct(f.actual)}%` : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtPct(f.consensus)}%
          </span>
          <span className={`text-[8px] font-mono font-bold text-right pr-2 ${f.surprise !== null ? surpriseColor(f.surprise) : 'text-neutral-500'}`}>
            {f.surprise !== null ? fmtChange(f.surprise) : '--'}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- TIPS Fund Flows --

function TipsFlowsSection({ flows }: { flows: TipsFlow[] }) {
  return (
    <div className="border-b border-orange-400/30">
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TIPS Fund Flows
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_48px_48px_48px_56px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Fund</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1M $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">3M $M</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-2">AUM $B</span>
      </div>

      {/* Rows */}
      {flows.map((f) => (
        <div
          key={f.fund}
          className="grid grid-cols-[1fr_48px_48px_48px_56px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-orange-400 truncate">{f.fund}</span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(f.flow1w)}`}>
            {fmtVol(f.flow1w)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(f.flow1m)}`}>
            {fmtVol(f.flow1m)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${flowColor(f.flow3m)}`}>
            {fmtVol(f.flow3m)}
          </span>
          <span className="text-[8px] font-mono text-white text-right pr-2">
            {fmtVol(f.aum)}
          </span>
        </div>
      ))}
    </div>
  );
}

// -- Global Inflation Comparison --

function GlobalInflationSection({ countries }: { countries: GlobalInflation[] }) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-orange-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Global Inflation Comparison
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_44px_44px_44px_52px_32px] gap-0 px-2 py-0.5 border-b border-orange-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">Country</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CPI</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Core</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">Target</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">5Y Swap</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center pr-2">Trd</span>
      </div>

      {/* Rows */}
      {countries.map((c) => {
        const gap = c.cpi - c.target;
        return (
          <div
            key={c.country}
            className="grid grid-cols-[1fr_44px_44px_44px_52px_32px] gap-0 px-2 py-[3px] border-b border-orange-400/5 hover:bg-orange-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white truncate">{c.country}</span>
            <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(c.cpi)}`}>
              {fmtPct(c.cpi)}%
            </span>
            <span className={`text-[8px] font-mono text-right ${inflationColor(c.core)}`}>
              {fmtPct(c.core)}%
            </span>
            <span className="text-[8px] font-mono text-neutral-400 text-right">
              {fmtPct(c.target)}%
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${inflationColor(c.swapRate5y)}`}>
              {fmtRate(c.swapRate5y)}%
            </span>
            <span className={`text-[9px] font-mono font-bold text-center pr-2 ${
              c.trend === 'rising' || c.trend === 'up' ? 'text-red-400' :
              c.trend === 'falling' || c.trend === 'down' ? 'text-green-400' :
              'text-neutral-500'
            }`}>
              {c.trend === 'rising' || c.trend === 'up' ? '\u2191' :
               c.trend === 'falling' || c.trend === 'down' ? '\u2193' : '\u2192'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
