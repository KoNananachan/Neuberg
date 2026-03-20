import { useState, useMemo } from 'react';
import { useFxCarryMonitor } from '../../api/hooks/use-fx-carry-monitor';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Types ──

interface CarryPair {
  pair: string;
  rateSpread: number;
  carryPct: number;
  spotReturn: number;
  totalReturn: number;
  sharpe: number;
  volAdjCarry: number;
}

interface G10Rate {
  currency: string;
  policyRate: number;
  ois: number;
  swapRate: number;
  vsUsdSpread: number;
}

interface CarryBasket {
  strategy: string;
  returnPct: number;
  vol: number;
  sharpe: number;
  positions: number;
}

interface RiskMetrics {
  vix: number;
  emVol: number;
  carryUnwindRisk: number;
  stressScore: number;
}

interface FxCarryMonitorData {
  timestamp: string;
  carryTable: CarryPair[];
  g10Rates: G10Rate[];
  carryBaskets: CarryBasket[];
  risk: RiskMetrics;
}

type TabMode = 'carry' | 'rates' | 'baskets' | 'risk';

// ── Formatting helpers ──

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtBps(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(0)}bp`;
}

function fmtRatio(n: number): string {
  return n.toFixed(2);
}

function fmtRate(n: number): string {
  return `${n.toFixed(2)}%`;
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function sharpeColor(n: number): string {
  if (n >= 1.0) return 'text-green-400';
  if (n >= 0.5) return 'text-yellow-400';
  if (n >= 0) return 'text-neutral-400';
  return 'text-red-400';
}

function riskLevelColor(score: number): { text: string; bg: string } {
  if (score >= 75) return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  if (score >= 50) return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border border-yellow-500/30' };
  if (score >= 25) return { text: 'text-teal-400', bg: 'bg-teal-500/10 border border-teal-500/30' };
  return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
}

function riskLabel(score: number): string {
  if (score >= 75) return 'HIGH';
  if (score >= 50) return 'ELEVATED';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function spreadColor(n: number): string {
  if (n > 200) return 'text-green-400';
  if (n > 100) return 'text-teal-400';
  if (n > 0) return 'text-neutral-400';
  return 'text-red-400';
}

// ── Main Panel ──

export function FxCarryMonitorPanel() {
  const t = useT();
  const { data: rawData, isLoading, refetch } = useFxCarryMonitor();
  const [tab, setTab] = useState<TabMode>('carry');

  const data = rawData as FxCarryMonitorData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'fcmTitle', 'FX Carry Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.risk && <StressScoreBadge score={data.risk.stressScore} t={t} />}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-3 py-1 border-b border-border/20 bg-[#050505] shrink-0">
        {(['carry', 'rates', 'baskets', 'risk'] as TabMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setTab(mode)}
            className={`px-2.5 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
              tab === mode
                ? 'border-teal-400/40 text-teal-400 bg-teal-400/10'
                : 'border-border/20 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {mode === 'carry'
              ? tr(t, 'fcmCarry', 'Carry')
              : mode === 'rates'
                ? tr(t, 'fcmRates', 'Rates')
                : mode === 'baskets'
                  ? tr(t, 'fcmBaskets', 'Baskets')
                  : tr(t, 'fcmRisk', 'Risk')}
          </button>
        ))}
        {data?.timestamp && (
          <span className="ml-auto text-[7px] font-mono text-neutral-600">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'fcmNoData', 'No data available')}
          </div>
        )}

        {data && tab === 'carry' && <CarryTableSection data={data} t={t} />}
        {data && tab === 'rates' && <G10RatesSection rates={data.g10Rates} t={t} />}
        {data && tab === 'baskets' && <CarryBasketsSection baskets={data.carryBaskets} t={t} />}
        {data && tab === 'risk' && <RiskMetricsSection risk={data.risk} t={t} />}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.carryTable?.length ?? 0} pairs` : '---'}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data.g10Rates?.length ?? 0} G10` : '---'}
        </span>
      </div>
    </div>
  );
}

// ── Stress Score Badge ──

function StressScoreBadge({
  score,
  t,
}: {
  score: number;
  t: ReturnType<typeof useT>;
}) {
  const style = riskLevelColor(score);
  return (
    <span className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${style.text} ${style.bg}`}>
      {tr(t, 'fcmStress', 'Stress')}: {riskLabel(score)}
    </span>
  );
}

// ── Section 1: Carry Table ──

function CarryTableSection({
  data,
  t,
}: {
  data: FxCarryMonitorData;
  t: ReturnType<typeof useT>;
}) {
  const sorted = useMemo(
    () => [...(data.carryTable ?? [])].sort((a, b) => b.totalReturn - a.totalReturn),
    [data.carryTable],
  );

  const maxCarry = useMemo(
    () => Math.max(...sorted.map((p) => Math.abs(p.volAdjCarry)), 0.01),
    [sorted],
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fcmCarryTable', 'Carry Ranking')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">
          {tr(t, 'fcmSortedByReturn', 'Sorted by total return')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[72px_56px_52px_52px_52px_48px_52px_1fr] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fcmPair', 'Pair')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmSpread', 'Spread')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmCarryPct', 'Carry%')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmSpotRet', 'Spot')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmTotalRet', 'Total')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmSharpe', 'Sharpe')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmVolAdj', 'Vol Adj')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">{tr(t, 'fcmBar', '')}</span>
      </div>

      {/* Rows */}
      {sorted.map((pair) => (
        <CarryRow key={pair.pair} pair={pair} maxCarry={maxCarry} />
      ))}
    </div>
  );
}

function CarryRow({
  pair,
  maxCarry,
}: {
  pair: CarryPair;
  maxCarry: number;
}) {
  const barWidth = maxCarry > 0 ? (Math.abs(pair.volAdjCarry) / maxCarry) * 100 : 0;
  const barColor = pair.volAdjCarry >= 0 ? 'bg-teal-500' : 'bg-red-500';

  return (
    <div className="grid grid-cols-[72px_56px_52px_52px_52px_48px_52px_1fr] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      {/* Pair */}
      <span className="text-[8px] font-mono font-bold text-white">{pair.pair}</span>

      {/* Rate Spread (bps) */}
      <span className={`text-[8px] font-mono text-right ${spreadColor(pair.rateSpread)}`}>
        {fmtBps(pair.rateSpread)}
      </span>

      {/* Carry % */}
      <span className="text-[8px] font-mono text-teal-400/80 text-right">
        {fmtPct(pair.carryPct)}
      </span>

      {/* Spot Return */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.spotReturn)}`}>
        {fmtPct(pair.spotReturn)}
      </span>

      {/* Total Return */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.totalReturn)}`}>
        {fmtPct(pair.totalReturn)}
      </span>

      {/* Sharpe */}
      <span className={`text-[8px] font-mono font-bold text-right ${sharpeColor(pair.sharpe)}`}>
        {fmtRatio(pair.sharpe)}
      </span>

      {/* Vol-Adjusted Carry */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(pair.volAdjCarry)}`}>
        {fmtRatio(pair.volAdjCarry)}
      </span>

      {/* Bar */}
      <div className="flex justify-end pr-1">
        <div className="w-16 h-[3px] bg-neutral-800 relative">
          <div
            className={`absolute left-0 top-0 h-full ${barColor}`}
            style={{ width: `${Math.min(barWidth, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Section 2: G10 Rate Differentials ──

function G10RatesSection({
  rates,
  t,
}: {
  rates: G10Rate[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fcmG10Rates', 'G10 Rate Differentials')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[64px_60px_60px_64px_72px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fcmCcy', 'CCY')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmPolicy', 'Policy')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmOIS', 'OIS')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmSwap', 'Swap')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmVsUSD', 'vs USD')}</span>
      </div>

      {/* Rows */}
      {(rates ?? []).map((rate) => (
        <G10RateRow key={rate.currency} rate={rate} />
      ))}

      {/* Compact grid summary */}
      <div className="px-2 py-1.5 border-t border-border/10">
        <div className="grid grid-cols-5 gap-px bg-border/10">
          {(rates ?? []).map((rate) => (
            <div key={rate.currency} className="bg-black px-1.5 py-1">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {rate.currency}
              </div>
              <div className={`text-[9px] font-mono font-bold ${changeColor(rate.vsUsdSpread)}`}>
                {rate.vsUsdSpread >= 0 ? '+' : ''}{rate.vsUsdSpread.toFixed(0)}bp
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function G10RateRow({ rate }: { rate: G10Rate }) {
  return (
    <div className="grid grid-cols-[64px_60px_60px_64px_72px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      {/* Currency */}
      <span className="text-[8px] font-mono font-bold text-white">{rate.currency}</span>

      {/* Policy Rate */}
      <span className="text-[8px] font-mono text-neutral-300 text-right">{fmtRate(rate.policyRate)}</span>

      {/* OIS */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(rate.ois)}</span>

      {/* Swap Rate */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">{fmtRate(rate.swapRate)}</span>

      {/* vs USD Spread */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(rate.vsUsdSpread)}`}>
        {fmtBps(rate.vsUsdSpread)}
      </span>
    </div>
  );
}

// ── Section 3: Carry Basket Performance ──

function CarryBasketsSection({
  baskets,
  t,
}: {
  baskets: CarryBasket[];
  t: ReturnType<typeof useT>;
}) {
  const maxReturn = useMemo(
    () => Math.max(...(baskets ?? []).map((b) => Math.abs(b.returnPct)), 0.01),
    [baskets],
  );

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fcmBasketPerf', 'Carry Basket Performance')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_52px_52px_48px_80px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">{tr(t, 'fcmStrategy', 'Strategy')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmReturn', 'Return')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmVolLabel', 'Vol')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmSharpeLabel', 'Sharpe')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right">{tr(t, 'fcmPos', 'Pos')}</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase text-right pr-1">{tr(t, 'fcmPerfBar', '')}</span>
      </div>

      {/* Rows */}
      {(baskets ?? []).map((basket) => (
        <BasketRow key={basket.strategy} basket={basket} maxReturn={maxReturn} />
      ))}

      {/* Summary cards */}
      {baskets && baskets.length > 0 && (
        <div className="grid grid-cols-3 gap-px bg-border/10 border-t border-border/10">
          {baskets.slice(0, 3).map((b) => (
            <div key={b.strategy} className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider truncate">
                {b.strategy}
              </div>
              <div className={`text-[10px] font-mono font-bold ${changeColor(b.returnPct)}`}>
                {fmtPct(b.returnPct)}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[7px] font-mono text-neutral-600">SR</span>
                <span className={`text-[8px] font-mono font-bold ${sharpeColor(b.sharpe)}`}>
                  {fmtRatio(b.sharpe)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BasketRow({
  basket,
  maxReturn,
}: {
  basket: CarryBasket;
  maxReturn: number;
}) {
  const barWidth = maxReturn > 0 ? (Math.abs(basket.returnPct) / maxReturn) * 100 : 0;
  const barColor = basket.returnPct >= 0 ? 'bg-teal-500' : 'bg-red-500';

  return (
    <div className="grid grid-cols-[1fr_60px_52px_52px_48px_80px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center">
      {/* Strategy */}
      <span className="text-[8px] font-mono font-bold text-white truncate">{basket.strategy}</span>

      {/* Return */}
      <span className={`text-[8px] font-mono font-bold text-right ${changeColor(basket.returnPct)}`}>
        {fmtPct(basket.returnPct)}
      </span>

      {/* Vol */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {basket.vol.toFixed(1)}%
      </span>

      {/* Sharpe */}
      <span className={`text-[8px] font-mono font-bold text-right ${sharpeColor(basket.sharpe)}`}>
        {fmtRatio(basket.sharpe)}
      </span>

      {/* Positions */}
      <span className="text-[8px] font-mono text-neutral-400 text-right">
        {basket.positions}
      </span>

      {/* Performance bar */}
      <div className="flex justify-end pr-1">
        <div className="w-16 h-[3px] bg-neutral-800 relative">
          <div
            className={`absolute left-0 top-0 h-full ${barColor}`}
            style={{ width: `${Math.min(barWidth, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Section 4: Risk Metrics ──

function RiskMetricsSection({
  risk,
  t,
}: {
  risk: RiskMetrics;
  t: ReturnType<typeof useT>;
}) {
  const stressStyle = riskLevelColor(risk.stressScore);
  const unwindStyle = riskLevelColor(risk.carryUnwindRisk);

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-teal-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'fcmRiskMetrics', 'Risk Metrics')}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        {/* VIX */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fcmVix', 'VIX')}
          </div>
          <div className={`text-[14px] font-mono font-black leading-tight ${
            risk.vix < 15 ? 'text-green-400' : risk.vix <= 25 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {risk.vix.toFixed(1)}
          </div>
          <VixBar value={risk.vix} />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[6px] font-mono text-green-600">LOW</span>
            <span className="text-[6px] font-mono text-red-600">HIGH</span>
          </div>
        </div>

        {/* EM Vol */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fcmEMVol', 'EM FX Vol')}
          </div>
          <div className={`text-[14px] font-mono font-black leading-tight ${
            risk.emVol < 8 ? 'text-green-400' : risk.emVol <= 12 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {risk.emVol.toFixed(1)}
          </div>
          <VixBar value={risk.emVol * 2} />
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-[6px] font-mono text-green-600">CALM</span>
            <span className="text-[6px] font-mono text-red-600">STRESS</span>
          </div>
        </div>

        {/* Carry Unwind Risk */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fcmUnwind', 'Carry Unwind Risk')}
          </div>
          <div className={`text-[14px] font-mono font-black leading-tight ${unwindStyle.text}`}>
            {risk.carryUnwindRisk.toFixed(0)}
          </div>
          <div className={`mt-1 px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider inline-block ${unwindStyle.text} ${unwindStyle.bg}`}>
            {riskLabel(risk.carryUnwindRisk)}
          </div>
        </div>

        {/* Stress Score */}
        <div className="bg-black px-3 py-2">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'fcmStressScore', 'Stress Score')}
          </div>
          <div className={`text-[14px] font-mono font-black leading-tight ${stressStyle.text}`}>
            {risk.stressScore.toFixed(0)}
          </div>
          <div className={`mt-1 px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider inline-block ${stressStyle.text} ${stressStyle.bg}`}>
            {riskLabel(risk.stressScore)}
          </div>
        </div>
      </div>

      {/* Risk gauge composite */}
      <div className="px-3 py-2 border-t border-border/10">
        <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider mb-1">
          {tr(t, 'fcmComposite', 'Composite Risk Gauge')}
        </div>
        <CompositeGauge risk={risk} />
        <div className="grid grid-cols-4 gap-2 mt-1.5">
          <GaugeLabel label="VIX" value={risk.vix.toFixed(1)} vix={risk.vix} />
          <GaugeLabel label="EM Vol" value={risk.emVol.toFixed(1)} vix={risk.emVol * 2} />
          <GaugeLabel label="Unwind" value={`${risk.carryUnwindRisk.toFixed(0)}`} vix={risk.carryUnwindRisk / 2} />
          <GaugeLabel label="Stress" value={`${risk.stressScore.toFixed(0)}`} vix={risk.stressScore / 2} />
        </div>
      </div>
    </div>
  );
}

// ── SVG VIX Bar ──

function VixBar({ value }: { value: number }) {
  const W = 200;
  const H = 8;
  const pct = Math.min(value / 50, 1);
  const fillW = pct * (W - 4);
  const fillColor = value < 15 ? '#2dd4bf' : value <= 25 ? '#eab308' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-1" style={{ maxHeight: 8 }}>
      <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,0.04)" />
      <rect x="2" y="1" width={Math.max(fillW, 2)} height={H - 2} fill={fillColor} opacity={0.7} />
      <line x1={W * 0.3} y1="0" x2={W * 0.3} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <line x1={W * 0.5} y1="0" x2={W * 0.5} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
      <line x1={W * 0.7} y1="0" x2={W * 0.7} y2={H} stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
    </svg>
  );
}

// ── Composite Risk Gauge (SVG) ──

function CompositeGauge({ risk }: { risk: RiskMetrics }) {
  const W = 300;
  const H = 16;
  const segments = [
    { label: 'VIX', value: Math.min(risk.vix / 50, 1), weight: 0.3 },
    { label: 'EM', value: Math.min(risk.emVol / 25, 1), weight: 0.2 },
    { label: 'UNW', value: Math.min(risk.carryUnwindRisk / 100, 1), weight: 0.25 },
    { label: 'STR', value: Math.min(risk.stressScore / 100, 1), weight: 0.25 },
  ];

  const composite = segments.reduce((acc, s) => acc + s.value * s.weight, 0);
  const fillW = composite * (W - 4);
  const fillColor = composite < 0.3 ? '#2dd4bf' : composite < 0.6 ? '#eab308' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 16 }}>
      <rect x="0" y="0" width={W} height={H} fill="rgba(255,255,255,0.03)" />
      <rect x="2" y="2" width={Math.max(fillW, 2)} height={H - 4} fill={fillColor} opacity={0.6} />
      {/* Zone markers */}
      <line x1={W * 0.3} y1="0" x2={W * 0.3} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      <line x1={W * 0.6} y1="0" x2={W * 0.6} y2={H} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
      {/* Pointer */}
      <line x1={2 + fillW} y1="0" x2={2 + fillW} y2={H} stroke={fillColor} strokeWidth="1.5" />
    </svg>
  );
}

// ── Gauge Label ──

function GaugeLabel({ label, value, vix }: { label: string; value: string; vix: number }) {
  const color = vix < 15 ? 'text-teal-400' : vix <= 25 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="text-center">
      <div className="text-[6px] font-mono text-neutral-600 uppercase tracking-wider">{label}</div>
      <div className={`text-[8px] font-mono font-bold ${color}`}>{value}</div>
    </div>
  );
}
