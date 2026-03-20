import { useGlobalSupplyChain } from '../../api/hooks/use-global-supply-chain';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw, Anchor } from 'lucide-react';

import type {
  GlobalSupplyChainData,
  GlobalSupplyChainSummary,
  ShippingRate,
  PortCongestion,
  SupplyChainIndicator,
} from '../../api/hooks/use-global-supply-chain';

// i18n fallback helper
// ── Color helpers ──

function changeColor(value: number): string {
  if (value > 0) return 'text-red-400';
  if (value < 0) return 'text-emerald-400';
  return 'text-neutral-500';
}

function changeSign(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}

function stressBadge(level: string): { color: string; bg: string } {
  switch (level) {
    case 'CRITICAL':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'HIGH':
      return { color: 'text-orange-400', bg: 'bg-orange-400/15' };
    case 'ELEVATED':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    case 'LOW':
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    default:
      return { color: 'text-lime-400', bg: 'bg-lime-400/15' };
  }
}

function congestionBadge(level: string): { color: string; bg: string } {
  switch (level) {
    case 'SEVERE':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'HIGH':
      return { color: 'text-orange-400', bg: 'bg-orange-400/15' };
    case 'MODERATE':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    default:
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
  }
}

function signalBadge(signal: string): { color: string; bg: string } {
  switch (signal) {
    case 'STRESS':
      return { color: 'text-red-400', bg: 'bg-red-400/15' };
    case 'ELEVATED':
      return { color: 'text-yellow-400', bg: 'bg-yellow-400/15' };
    case 'EASING':
      return { color: 'text-emerald-400', bg: 'bg-emerald-400/15' };
    default:
      return { color: 'text-neutral-400', bg: 'bg-neutral-400/10' };
  }
}

function bdiColor(level: number): string {
  if (level > 2000) return 'text-red-400';
  if (level > 1500) return 'text-orange-400';
  if (level > 1000) return 'text-lime-400';
  return 'text-emerald-400';
}

function fmtRate(n: number): string {
  if (n >= 10000) return '$' + (n / 1000).toFixed(1) + 'K';
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtThroughput(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}

function fmtCapacity(n: number): string {
  if (n >= 100) return n.toFixed(0) + '%';
  return n.toFixed(1) + '%';
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 border-b border-lime-400/30">
      <div className="w-1 h-1 shrink-0 bg-lime-400" />
      <span className="text-[7px] font-black font-mono uppercase tracking-widest text-lime-400">
        {title}
      </span>
    </div>
  );
}

// ── Table header cell ──

function ThCell({ label, align }: { label: string; align: 'left' | 'right' }) {
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {label}
    </th>
  );
}

// ── Summary Bar ──

function SummaryBar({ summary }: { summary: GlobalSupplyChainSummary }) {
  const stress = stressBadge(summary.supplyChainStress);

  return (
    <div className="grid grid-cols-4 border-b border-lime-400/30 bg-black">
      <div className="px-2 py-1.5 border-r border-lime-400/10">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
          Avg Shipping Rate
        </div>
        <div className="text-[10px] font-mono font-bold text-lime-400">
          {fmtRate(summary.avgShippingRate)}/TEU
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-lime-400/10">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
          Avg Port Wait
        </div>
        <div className="text-[10px] font-mono font-bold text-neutral-300">
          {summary.avgPortWait.toFixed(1)}d
        </div>
      </div>
      <div className="px-2 py-1.5 border-r border-lime-400/10">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
          SC Stress
        </div>
        <span className={`text-[9px] font-mono font-black uppercase px-1 py-0.5 ${stress.color} ${stress.bg}`}>
          {summary.supplyChainStress}
        </span>
      </div>
      <div className="px-2 py-1.5">
        <div className="text-[7px] font-mono uppercase tracking-wider text-neutral-500">
          BDI Level
        </div>
        <div className={`text-[10px] font-mono font-bold ${bdiColor(summary.bdiLevel)}`}>
          {summary.bdiLevel.toLocaleString('en-US')}
        </div>
      </div>
    </div>
  );
}

// ── Shipping Rates Table ──

function ShippingRatesTable({ rates }: { rates: ShippingRate[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Route" align="left" />
            <ThCell label="Type" align="left" />
            <ThCell label="Rate ($/TEU)" align="right" />
            <ThCell label="1W Chg (%)" align="right" />
            <ThCell label="1M Chg (%)" align="right" />
            <ThCell label="Index" align="right" />
            <ThCell label="Capacity" align="right" />
          </tr>
        </thead>
        <tbody>
          {rates.map((r, i) => (
            <tr
              key={`${r.route}-${r.type}-${i}`}
              className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
            >
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                {r.route}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-left text-neutral-400">
                {r.type}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-lime-400 font-bold">
                {fmtRate(r.rate)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(r.change1w)}`}>
                {changeSign(r.change1w)}
              </td>
              <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(r.change1m)}`}>
                {changeSign(r.change1m)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                {r.index.toFixed(1)}
              </td>
              <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                {fmtCapacity(r.capacity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Port Congestion Table ──

function PortCongestionTable({ ports }: { ports: PortCongestion[] }) {
  const sorted = [...ports].sort((a, b) => b.avgWaitDays - a.avgWaitDays);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Port" align="left" />
            <ThCell label="Avg Wait (days)" align="right" />
            <ThCell label="Vessel Queue" align="right" />
            <ThCell label="Throughput (TEU/mo)" align="right" />
            <ThCell label="1M Chg" align="right" />
            <ThCell label="Congestion" align="left" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((p, i) => {
            const badge = congestionBadge(p.congestion);
            return (
              <tr
                key={`${p.port}-${i}`}
                className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {p.port}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {p.avgWaitDays.toFixed(1)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-400">
                  {p.vesselQueue}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300">
                  {fmtThroughput(p.throughput)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(p.change1m)}`}>
                  {changeSign(p.change1m)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${badge.color} ${badge.bg}`}>
                    {p.congestion}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Percentile Bar ──

function PercentileBar({ pct }: { pct: number }) {
  const color =
    pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : pct > 40 ? '#a3e635' : '#34d399';

  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-neutral-900 relative">
        <div
          className="absolute top-0 left-0 h-full"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color, opacity: 0.7 }}
        />
      </div>
      <span className="text-[8px] font-mono font-bold tabular-nums" style={{ color }}>
        {pct}
      </span>
    </div>
  );
}

// ── Supply Chain Indicators Table ──

function IndicatorsTable({ indicators }: { indicators: SupplyChainIndicator[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <ThCell label="Indicator" align="left" />
            <ThCell label="Value" align="right" />
            <ThCell label="1M Chg" align="right" />
            <ThCell label="Percentile" align="left" />
            <ThCell label="Signal" align="left" />
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind, i) => {
            const badge = signalBadge(ind.signal);
            return (
              <tr
                key={`${ind.indicator}-${i}`}
                className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
              >
                <td className="px-1.5 py-1 whitespace-nowrap text-left text-white font-bold">
                  {ind.indicator}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-right text-neutral-300 font-bold">
                  {ind.value.toFixed(2)}
                </td>
                <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold ${changeColor(ind.change1m)}`}>
                  {changeSign(ind.change1m)}
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <PercentileBar pct={ind.percentile} />
                </td>
                <td className="px-1.5 py-1 whitespace-nowrap text-left">
                  <span className={`text-[7px] font-bold px-1 py-0.5 uppercase ${badge.color} ${badge.bg}`}>
                    {ind.signal}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Panel ──

export function GlobalSupplyChainPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useGlobalSupplyChain();

  const scData = data as GlobalSupplyChainData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-lime-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-lime-400">
            {tr(t, 'gscTitle', 'Global Supply Chain Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {scData?.summary && (
            <span className="text-[8px] font-mono font-black tabular-nums text-lime-400">
              BDI {scData.summary.bdiLevel.toLocaleString('en-US')}
            </span>
          )}
          <button onClick={() => refetch()} className="p-1 text-neutral-600 hover:text-lime-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && !scData && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-lime-400/30 border-t-lime-400 animate-spin" />
            <span className="text-[9px] font-mono text-lime-400 uppercase tracking-wider animate-pulse">
              LOADING...
            </span>
          </div>
        </div>
      )}

      {/* No data */}
      {!scData && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'noData', 'No data')}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      {scData && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          {scData.summary && <SummaryBar summary={scData.summary} />}

          {/* Shipping Rates */}
          {scData.shippingRates && scData.shippingRates.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'gscShippingRates', 'Shipping Rates')} />
              <ShippingRatesTable rates={scData.shippingRates} />
            </>
          )}

          {/* Port Congestion */}
          {scData.portCongestion && scData.portCongestion.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'gscPortCongestion', 'Port Congestion')} />
              <PortCongestionTable ports={scData.portCongestion} />
            </>
          )}

          {/* Supply Chain Indicators */}
          {scData.indicators && scData.indicators.length > 0 && (
            <>
              <SectionHeader title={tr(t, 'gscIndicators', 'Supply Chain Indicators')} />
              <IndicatorsTable indicators={scData.indicators} />
            </>
          )}

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
