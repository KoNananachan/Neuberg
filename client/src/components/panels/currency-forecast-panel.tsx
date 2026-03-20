import { useMemo } from 'react';
import { useCurrencyForecast } from '../../api/hooks/use-currency-forecast';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// i18n fallback helper
// ── Types ──

interface ForecastPair {
  pair: string;
  spot: number;
  pppFairValue: number;
  pppDeviation: number;
  irpForecast3M: number;
  irpForecast12M: number;
  consensusForecast3M: number;
  consensusForecast6M: number;
  consensusForecast12M: number;
  impliedVol3M: number;
  riskReversal25d: number;
  carryReturn3M: number;
  signal: string;
  confidence: number;
  rateDifferential: number;
}

interface ForecastModel {
  name: string;
  description: string;
  accuracy1Y: number;
  bestPair: string;
}

interface ForecastSummary {
  mostOvervalued: string;
  mostUndervalued: string;
  highestCarry: string;
  strongestSignal: string;
  avgModelAccuracy: number;
}

// ── Formatting helpers ──

function fmtSpot(n: number): string {
  return n.toFixed(4);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtRate(n: number): string {
  return n.toFixed(4);
}

function fmtVol(n: number): string {
  return `${n.toFixed(1)}%`;
}

// ── Color helpers ──

function deviationColor(dev: number): string {
  if (dev > 5) return 'text-red-400';
  if (dev > 0) return 'text-red-400/70';
  if (dev < -5) return 'text-green-400';
  if (dev < 0) return 'text-green-400/70';
  return 'text-neutral-500';
}

function signalColor(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'buy') return 'text-green-400';
  if (s === 'sell') return 'text-red-400';
  return 'text-neutral-500';
}

function signalBg(signal: string): string {
  const s = signal.toLowerCase();
  if (s === 'buy') return 'bg-green-400/10';
  if (s === 'sell') return 'bg-red-400/10';
  return 'bg-neutral-500/5';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

// ── Main Component ──

export function CurrencyForecastPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useCurrencyForecast();

  const pairs = useMemo<ForecastPair[]>(() => data?.pairs ?? [], [data]);
  const models = useMemo<ForecastModel[]>(() => data?.models ?? [], [data]);
  const summary = useMemo<ForecastSummary | null>(() => data?.summary ?? null, [data]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-black border-b border-teal-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-teal-400">
            {tr(t, 'cfTitle', 'CURRENCY FORECAST')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider animate-pulse">
            LOADING...
          </span>
        </div>
      )}

      {data && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary Bar */}
          {summary && (
            <div className="grid grid-cols-4 gap-px border-b border-teal-400/30 bg-black shrink-0">
              <SummaryCell
                label={tr(t, 'cfMostOvervalued', 'MOST OVERVALUED')}
                value={summary.mostOvervalued}
                color="text-red-400"
              />
              <SummaryCell
                label={tr(t, 'cfMostUndervalued', 'MOST UNDERVALUED')}
                value={summary.mostUndervalued}
                color="text-green-400"
              />
              <SummaryCell
                label={tr(t, 'cfHighestCarry', 'HIGHEST CARRY')}
                value={summary.highestCarry}
                color="text-teal-400"
              />
              <SummaryCell
                label={tr(t, 'cfStrongestSignal', 'STRONGEST SIGNAL')}
                value={summary.strongestSignal}
                color="text-yellow-400"
              />
            </div>
          )}

          {/* Main Pairs Table */}
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-teal-400/20">
                  <Th align="left">{tr(t, 'cfPair', 'PAIR')}</Th>
                  <Th>{tr(t, 'cfSpot', 'SPOT')}</Th>
                  <Th>{tr(t, 'cfPppFv', 'PPP FV')}</Th>
                  <Th>{tr(t, 'cfPppDev', 'PPP DEV')}</Th>
                  <Th>{tr(t, 'cfIrp3m', 'IRP 3M')}</Th>
                  <Th>{tr(t, 'cfIrp12m', 'IRP 12M')}</Th>
                  <Th>{tr(t, 'cfCons3m', 'CONS 3M')}</Th>
                  <Th>{tr(t, 'cfCons6m', 'CONS 6M')}</Th>
                  <Th>{tr(t, 'cfCons12m', 'CONS 12M')}</Th>
                  <Th>{tr(t, 'cfImpVol', 'IMP VOL')}</Th>
                  <Th>{tr(t, 'cfCarry', 'CARRY')}</Th>
                  <Th>{tr(t, 'cfSignal', 'SIGNAL')}</Th>
                  <Th>{tr(t, 'cfConf', 'CONF')}</Th>
                </tr>
              </thead>
              <tbody>
                {pairs.map((p) => (
                  <PairRow key={p.pair} pair={p} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Model Summary Section */}
          {models.length > 0 && (
            <div className="border-t border-teal-400/30 mt-1">
              <div className="px-3 py-1 border-b border-teal-400/20">
                <span className="text-[8px] font-bold uppercase tracking-wider text-teal-400/60">
                  {tr(t, 'cfModels', 'FORECAST MODELS')}
                  {summary && (
                    <span className="ml-2 text-neutral-500">
                      AVG ACCURACY {summary.avgModelAccuracy.toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-px">
                {models.map((m) => (
                  <ModelCard key={m.name} model={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Bar */}
      <div className="px-3 py-1 border-t border-teal-400/30 bg-black shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${pairs.length} ${tr(t, 'cfPairs', 'pairs')}` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${models.length} ${tr(t, 'cfModelsCount', 'models')}` : ''}
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ──

function SummaryCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="px-3 py-1.5 text-center">
      <div className="text-[7px] text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[10px] font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Th({
  children,
  align = 'right',
}: {
  children: string;
  align?: 'left' | 'right';
}) {
  return (
    <th
      className={`px-2 py-1 text-[7px] font-bold uppercase tracking-wider text-teal-400/50 whitespace-nowrap ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
    >
      {children}
    </th>
  );
}

function PairRow({ pair: p }: { pair: ForecastPair }) {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-teal-400/[0.02] transition-colors">
      {/* Pair */}
      <td className="px-2 py-1 text-[9px] text-white font-bold whitespace-nowrap text-left">
        {p.pair}
        <span className="ml-1.5 text-[7px] text-neutral-600">
          {fmtPct(p.rateDifferential)}
        </span>
      </td>

      {/* Spot */}
      <td className="px-2 py-1 text-[9px] text-white text-right tabular-nums">
        {fmtSpot(p.spot)}
      </td>

      {/* PPP Fair Value */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtSpot(p.pppFairValue)}
      </td>

      {/* PPP Deviation */}
      <td className={`px-2 py-1 text-[9px] text-right tabular-nums ${deviationColor(p.pppDeviation)}`}>
        {fmtPct(p.pppDeviation)}
      </td>

      {/* IRP 3M */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtRate(p.irpForecast3M)}
      </td>

      {/* IRP 12M */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtRate(p.irpForecast12M)}
      </td>

      {/* Consensus 3M */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtRate(p.consensusForecast3M)}
      </td>

      {/* Consensus 6M */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtRate(p.consensusForecast6M)}
      </td>

      {/* Consensus 12M */}
      <td className="px-2 py-1 text-[9px] text-neutral-400 text-right tabular-nums">
        {fmtRate(p.consensusForecast12M)}
      </td>

      {/* Implied Vol 3M */}
      <td className="px-2 py-1 text-[9px] text-yellow-400/70 text-right tabular-nums">
        {fmtVol(p.impliedVol3M)}
      </td>

      {/* Carry Return 3M */}
      <td className={`px-2 py-1 text-[9px] text-right tabular-nums ${changeColor(p.carryReturn3M)}`}>
        {fmtPct(p.carryReturn3M)}
      </td>

      {/* Signal */}
      <td className="px-2 py-1 text-right">
        <span
          className={`inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase ${signalColor(p.signal)} ${signalBg(p.signal)}`}
        >
          {p.signal}
        </span>
      </td>

      {/* Confidence Bar */}
      <td className="px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="w-12 h-1.5 bg-white/[0.04] overflow-hidden">
            <div
              className="h-full bg-teal-400/40 transition-all"
              style={{ width: `${Math.min(p.confidence * 100, 100)}%` }}
            />
          </div>
          <span className="text-[7px] text-neutral-600 tabular-nums w-6 text-right">
            {(p.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </td>
    </tr>
  );
}

function ModelCard({ model }: { model: ForecastModel }) {
  const t = useT();
  return (
    <div className="px-3 py-2 hover:bg-teal-400/[0.02] transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-teal-400">{model.name}</span>
        <span className="text-[8px] text-neutral-500">
          {tr(t, 'cfBestPair', 'Best')}: {model.bestPair}
        </span>
      </div>
      <div className="text-[8px] text-neutral-500 mt-0.5 leading-tight">
        {model.description}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[7px] text-neutral-600 uppercase tracking-wider">
          1Y ACCURACY
        </span>
        <div className="flex-1 h-1 bg-white/[0.04] overflow-hidden">
          <div
            className="h-full bg-teal-400/50 transition-all"
            style={{ width: `${model.accuracy1Y}%` }}
          />
        </div>
        <span className="text-[8px] text-teal-400 tabular-nums">
          {model.accuracy1Y.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
