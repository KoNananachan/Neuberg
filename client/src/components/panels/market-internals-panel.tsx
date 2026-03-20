import { useState } from 'react';
import { useMarketInternals, type ExchangeData, type HistoryEntry } from '../../api/hooks/use-market-internals';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

type View = 'BREADTH' | 'OSCILLATORS' | 'TREND';
type Exchange = 'NYSE' | 'NASDAQ' | 'COMBINED';

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function fmtSign(n: number, decimals = 2): string {
  return (n >= 0 ? '+' : '') + n.toFixed(decimals);
}

// ── Color helpers ─────────────────────────────────────────────────────────────
function adColor(ratio: number): string {
  return ratio > 1 ? 'text-emerald-400' : ratio < 1 ? 'text-red-400' : 'text-neutral-500';
}

function trinColor(interp: string): string {
  if (interp === 'Oversold') return 'text-emerald-400';
  if (interp === 'Overbought') return 'text-red-400';
  return 'text-neutral-400';
}

function mccColor(osc: number): string {
  return osc > 0 ? 'text-emerald-400' : osc < 0 ? 'text-red-400' : 'text-neutral-400';
}

function pctColor(val: number): string {
  if (val >= 60) return 'text-emerald-400';
  if (val <= 40) return 'text-red-400';
  return 'text-orange-400';
}

function trendArrow(current: number, threshold: number, inverted = false): string {
  if (inverted) {
    return current > threshold ? '\u25BC' : current < threshold ? '\u25B2' : '\u25C6';
  }
  return current > threshold ? '\u25B2' : current < threshold ? '\u25BC' : '\u25C6';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function HorizBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-1 h-[14px]">
      <span className="text-[8px] font-mono text-neutral-500 w-[52px] text-right shrink-0 uppercase">{label}</span>
      <div className="flex-1 h-[6px] bg-white/[0.03]">
        <div className="h-full transition-all" style={{ width: `${Math.max(pct, 1)}%`, backgroundColor: color }} />
      </div>
      <span className="text-[8px] font-mono text-neutral-400 w-[38px] text-right shrink-0">{fmt(value, 1)}%</span>
    </div>
  );
}

function ADBar({ advancing, declining, unchanged }: { advancing: number; declining: number; unchanged: number }) {
  const total = advancing + declining + unchanged;
  if (total === 0) return null;
  const advPct = (advancing / total) * 100;
  const unchPct = (unchanged / total) * 100;

  return (
    <div className="px-2 py-0.5">
      <div className="flex items-center justify-between mb-px">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">ADV / DECL</span>
        <div className="flex items-center gap-2 text-[8px] font-mono">
          <span className="text-emerald-400">{advancing}</span>
          <span className="text-neutral-600">{unchanged}</span>
          <span className="text-red-400">{declining}</span>
        </div>
      </div>
      <div className="flex h-[5px]">
        <div className="bg-emerald-500/80" style={{ width: `${advPct}%` }} />
        <div className="bg-neutral-700" style={{ width: `${unchPct}%` }} />
        <div className="bg-red-500/80" style={{ width: `${100 - advPct - unchPct}%` }} />
      </div>
    </div>
  );
}

function HighLowBar({ newHighs, newLows }: { newHighs: number; newLows: number }) {
  const total = newHighs + newLows;
  if (total === 0) return null;
  const highPct = (newHighs / total) * 100;

  return (
    <div className="px-2 py-0.5">
      <div className="flex items-center justify-between mb-px">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">NEW HI / LO</span>
        <div className="flex items-center gap-2 text-[8px] font-mono">
          <span className="text-emerald-400">{newHighs}</span>
          <span className="text-red-400">{newLows}</span>
        </div>
      </div>
      <div className="flex h-[5px]">
        <div className="bg-emerald-500/80" style={{ width: `${highPct}%` }} />
        <div className="bg-red-500/80" style={{ width: `${100 - highPct}%` }} />
      </div>
    </div>
  );
}

function TrinGauge({ value, interpretation }: { value: number; interpretation: string }) {
  // TRIN range typically 0.3 - 3.0, normalize to 0-100%
  const normalized = Math.min(Math.max((value - 0.3) / 2.7, 0), 1) * 100;
  const oversoldX = ((1.5 - 0.3) / 2.7) * 100;
  const overboughtX = ((0.7 - 0.3) / 2.7) * 100;

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">TRIN (ARMS INDEX)</span>
        <span className={`text-[9px] font-mono font-bold ${trinColor(interpretation)}`}>
          {fmt(value)} <span className="text-[7px] font-normal text-neutral-600">{interpretation}</span>
        </span>
      </div>
      <div className="relative h-[8px] bg-white/[0.03]">
        {/* Zones */}
        <div className="absolute inset-y-0 left-0 bg-red-500/10" style={{ width: `${overboughtX}%` }} />
        <div className="absolute inset-y-0 bg-emerald-500/5" style={{ left: `${overboughtX}%`, width: `${oversoldX - overboughtX}%` }} />
        <div className="absolute inset-y-0 right-0 bg-emerald-500/10" style={{ left: `${oversoldX}%` }} />
        {/* Needle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-orange-400"
          style={{ left: `${normalized}%` }}
        />
      </div>
      <div className="flex justify-between mt-px">
        <span className="text-[6px] font-mono text-red-400/40">OVERBOUGHT</span>
        <span className="text-[6px] font-mono text-neutral-600">NEUTRAL</span>
        <span className="text-[6px] font-mono text-emerald-400/40">OVERSOLD</span>
      </div>
    </div>
  );
}

function TickRange({ tickIndex }: { tickIndex: ExchangeData['tickIndex'] }) {
  const range = tickIndex.high - tickIndex.low;
  const currentPct = range > 0 ? ((tickIndex.current - tickIndex.low) / range) * 100 : 50;
  const closePct = range > 0 ? ((tickIndex.close - tickIndex.low) / range) * 100 : 50;

  return (
    <div className="px-2 py-1">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">TICK INDEX</span>
        <span className={`text-[9px] font-mono font-bold ${tickIndex.current > 0 ? 'text-emerald-400' : tickIndex.current < 0 ? 'text-red-400' : 'text-neutral-400'}`}>
          {fmtSign(tickIndex.current, 0)}
        </span>
      </div>
      <div className="relative h-[8px] bg-white/[0.03]">
        {/* Zero line */}
        <div
          className="absolute top-0 bottom-0 w-px bg-neutral-600"
          style={{ left: `${range > 0 ? ((-tickIndex.low) / range) * 100 : 50}%` }}
        />
        {/* Close marker */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-blue-400/50"
          style={{ left: `${closePct}%` }}
          title={`Close: ${tickIndex.close}`}
        />
        {/* Current marker */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-orange-400"
          style={{ left: `${currentPct}%` }}
        />
      </div>
      <div className="flex justify-between mt-px">
        <span className="text-[7px] font-mono text-red-400/60">L:{tickIndex.low}</span>
        <span className="text-[7px] font-mono text-blue-400/60">C:{tickIndex.close}</span>
        <span className="text-[7px] font-mono text-emerald-400/60">H:{tickIndex.high}</span>
      </div>
    </div>
  );
}

// ── Views ─────────────────────────────────────────────────────────────────────

function BreadthView({ data, t }: { data: ExchangeData; t: TFn }) {
  const ad = data.advanceDecline;
  const hl = data.newHighsLows;
  const vol = data.volume;
  const pma = data.percentAboveMA;

  return (
    <div className="flex flex-col gap-1">
      {/* AD Ratio header */}
      <div className="flex items-center justify-between px-2 py-1 border-b border-neutral-800">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'marketInternalsADRatio', 'A/D RATIO')}
        </span>
        <span className={`text-[10px] font-mono font-black ${adColor(ad.adRatio)}`}>
          {fmt(ad.adRatio)}
        </span>
      </div>

      <ADBar advancing={ad.advancing} declining={ad.declining} unchanged={ad.unchanged} />

      {/* AD Line stats */}
      <div className="flex items-center justify-between px-2 text-[8px] font-mono">
        <span className="text-neutral-600">AD LINE</span>
        <div className="flex gap-2">
          <span className={ad.adLine > 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtSign(ad.adLine, 0)}</span>
          <span className="text-neutral-600">5d: {fmt(ad.adLine5dMA, 0)}</span>
          <span className="text-neutral-600">20d: {fmt(ad.adLine20dMA, 0)}</span>
        </div>
      </div>

      <HighLowBar newHighs={hl.newHighs} newLows={hl.newLows} />

      {/* HL stats */}
      <div className="flex items-center justify-between px-2 text-[8px] font-mono">
        <span className="text-neutral-600">H/L DIFF</span>
        <div className="flex gap-2">
          <span className={hl.hlDiff > 0 ? 'text-emerald-400' : 'text-red-400'}>{fmtSign(hl.hlDiff, 0)}</span>
          <span className="text-neutral-600">10d MA: {fmt(hl.hlDiff10dMA, 0)}</span>
        </div>
      </div>

      {/* Volume breadth */}
      <div className="px-2 py-0.5">
        <div className="flex items-center justify-between mb-px">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'marketInternalsVolBreadth', 'VOLUME BREADTH')}
          </span>
          <span className={`text-[8px] font-mono font-bold ${vol.uvdvRatio > 1 ? 'text-emerald-400' : 'text-red-400'}`}>
            UV/DV: {fmt(vol.uvdvRatio)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[8px] font-mono">
          <span className="text-emerald-400/70">{fmtVol(vol.upVolume)}</span>
          <span className="text-neutral-700">/</span>
          <span className="text-red-400/70">{fmtVol(vol.downVolume)}</span>
          <span className="text-neutral-700">unch: {fmtVol(vol.unchangedVolume)}</span>
        </div>
      </div>

      {/* % Above MAs */}
      <div className="px-2 py-0.5">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'marketInternalsPctAboveMA', '% ABOVE MOVING AVG')}
        </span>
        <div className="flex flex-col gap-0.5 mt-1">
          <HorizBar label="20d MA" value={pma.above20dMA} max={100} color={pma.above20dMA >= 60 ? '#34d399' : pma.above20dMA <= 40 ? '#f87171' : '#fb923c'} />
          <HorizBar label="50d MA" value={pma.above50dMA} max={100} color={pma.above50dMA >= 60 ? '#34d399' : pma.above50dMA <= 40 ? '#f87171' : '#fb923c'} />
          <HorizBar label="200d MA" value={pma.above200dMA} max={100} color={pma.above200dMA >= 60 ? '#34d399' : pma.above200dMA <= 40 ? '#f87171' : '#fb923c'} />
        </div>
      </div>
    </div>
  );
}

function OscillatorsView({ data, t }: { data: ExchangeData; t: TFn }) {
  const mcc = data.mcclellan;
  const trin = data.trin;

  return (
    <div className="flex flex-col gap-1.5">
      {/* McClellan Oscillator */}
      <div className="px-2 py-1 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'marketInternalsMcClellan', 'MCCLELLAN OSCILLATOR')}
          </span>
          <span className={`text-[10px] font-mono font-black ${mccColor(mcc.oscillator)}`}>
            {fmtSign(mcc.oscillator)}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-[8px] font-mono">
          <span className="text-neutral-600">SIGNAL: <span className={mccColor(mcc.signal)}>{fmtSign(mcc.signal)}</span></span>
          <span className={`font-bold ${mcc.divergence === 'Bullish' ? 'text-emerald-400' : mcc.divergence === 'Bearish' ? 'text-red-400' : 'text-neutral-600'}`}>
            {mcc.divergence !== 'None' ? `DIV: ${mcc.divergence.toUpperCase()}` : 'NO DIVERGENCE'}
          </span>
        </div>
      </div>

      {/* McClellan visual bar */}
      <div className="px-2">
        <div className="relative h-[10px] bg-white/[0.03]">
          {/* Zero line */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-neutral-700" />
          {/* Bar from center */}
          {mcc.oscillator >= 0 ? (
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/60"
              style={{ left: '50%', width: `${Math.min(Math.abs(mcc.oscillator) / 120 * 50, 50)}%` }}
            />
          ) : (
            <div
              className="absolute top-0 bottom-0 bg-red-500/60"
              style={{ right: '50%', width: `${Math.min(Math.abs(mcc.oscillator) / 120 * 50, 50)}%` }}
            />
          )}
        </div>
        <div className="flex justify-between mt-px">
          <span className="text-[6px] font-mono text-red-400/40">-120</span>
          <span className="text-[6px] font-mono text-neutral-700">0</span>
          <span className="text-[6px] font-mono text-emerald-400/40">+120</span>
        </div>
      </div>

      {/* Summation Index */}
      <div className="px-2 py-1 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'marketInternalsSummation', 'SUMMATION INDEX')}
          </span>
          <span className={`text-[10px] font-mono font-black ${mcc.summationIndex > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {fmtSign(mcc.summationIndex, 0)}
          </span>
        </div>
      </div>

      {/* TRIN gauge */}
      <TrinGauge value={trin.value} interpretation={trin.interpretation} />
      <div className="px-2 text-[8px] font-mono text-neutral-600">
        5d MA: <span className={trinColor(trin.interpretation)}>{fmt(trin.ma5d)}</span>
      </div>

      {/* Tick Index */}
      <TickRange tickIndex={data.tickIndex} />
    </div>
  );
}

function TrendView({ data, history, t }: { data: ExchangeData; history: HistoryEntry[]; t: TFn }) {
  const bt = data.breadthThrust;

  return (
    <div className="flex flex-col gap-1">
      {/* Breadth Thrust */}
      <div className="px-2 py-1 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-600 uppercase">
            {tr(t, 'marketInternalsBreadthThrust', 'BREADTH THRUST')}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-mono font-bold ${bt.thrustSignal ? 'text-emerald-400' : 'text-neutral-500'}`}>
              {fmt(bt.value, 3)}
            </span>
            {bt.thrustSignal && (
              <span className="text-[7px] font-mono font-bold text-emerald-400 bg-emerald-400/10 px-1">
                THRUST
              </span>
            )}
          </div>
        </div>
        {bt.lastThrustDate && (
          <span className="text-[7px] font-mono text-neutral-600">
            Last signal: {bt.lastThrustDate}
          </span>
        )}
        {/* Thrust bar */}
        <div className="relative h-[6px] bg-white/[0.03] mt-1">
          <div
            className="absolute inset-y-0 left-0 bg-orange-400/15"
            style={{ width: `${(0.614 / 1) * 100}%` }}
          />
          <div
            className="absolute top-0 bottom-0 w-px bg-orange-400/50"
            style={{ left: `${(0.614 / 1) * 100}%` }}
            title="Zweig Threshold: 0.614"
          />
          <div
            className={`absolute inset-y-0 left-0 ${bt.thrustSignal ? 'bg-emerald-400/60' : 'bg-neutral-500/40'}`}
            style={{ width: `${Math.min(bt.value * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* 20-day History Table */}
      <div className="px-2 py-0.5">
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'marketInternalsHistory', '20-DAY HISTORY')}
        </span>
      </div>
      <div className="overflow-x-auto px-1">
        <table className="w-full text-[8px] font-mono">
          <thead>
            <tr className="text-neutral-600 border-b border-neutral-800">
              <th className="text-left py-0.5 px-1 font-normal">DATE</th>
              <th className="text-right py-0.5 px-1 font-normal">A/D</th>
              <th className="text-right py-0.5 px-1 font-normal">McCL</th>
              <th className="text-right py-0.5 px-1 font-normal">TRIN</th>
              <th className="text-right py-0.5 px-1 font-normal">&gt;200MA</th>
              <th className="text-center py-0.5 px-1 font-normal">TREND</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => {
              const prevRow = i > 0 ? history[i - 1] : null;
              const adTrend = prevRow ? trendArrow(row.adRatio, prevRow.adRatio) : '\u25C6';
              const mccTrend = prevRow ? trendArrow(row.mcclellanOsc, prevRow.mcclellanOsc) : '\u25C6';
              // TRIN is inverted: lower = more bullish
              const trinTrend = prevRow ? trendArrow(row.trin, prevRow.trin, true) : '\u25C6';

              return (
                <tr
                  key={row.date}
                  className="border-b border-neutral-800/50 hover:bg-orange-400/[0.02] transition-colors"
                >
                  <td className="text-left py-[2px] px-1 text-neutral-500">{row.date.slice(5)}</td>
                  <td className={`text-right py-[2px] px-1 ${adColor(row.adRatio)}`}>
                    {fmt(row.adRatio)}
                  </td>
                  <td className={`text-right py-[2px] px-1 ${mccColor(row.mcclellanOsc)}`}>
                    {fmtSign(row.mcclellanOsc, 1)}
                  </td>
                  <td className={`text-right py-[2px] px-1 ${row.trin > 1.5 ? 'text-emerald-400' : row.trin < 0.7 ? 'text-red-400' : 'text-neutral-400'}`}>
                    {fmt(row.trin)}
                  </td>
                  <td className={`text-right py-[2px] px-1 ${pctColor(row.pctAbove200MA)}`}>
                    {fmt(row.pctAbove200MA, 1)}%
                  </td>
                  <td className="text-center py-[2px] px-1">
                    <span className={row.adRatio > 1 ? 'text-emerald-400' : 'text-red-400'}>{adTrend}</span>
                    <span className={row.mcclellanOsc > 0 ? 'text-emerald-400' : 'text-red-400'}>{mccTrend}</span>
                    <span className={row.trin < 1 ? 'text-emerald-400' : 'text-red-400'}>{trinTrend}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function MarketInternalsPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useMarketInternals();
  const [view, setView] = useState<View>('BREADTH');
  const [exchange, setExchange] = useState<Exchange>('NYSE');

  const views: View[] = ['BREADTH', 'OSCILLATORS', 'TREND'];
  const exchanges: Exchange[] = ['NYSE', 'NASDAQ', 'COMBINED'];

  const selectedExchange = data?.exchanges.find((e) => e.exchange === exchange) ?? null;
  const adBadge = selectedExchange
    ? fmt(selectedExchange.advanceDecline.adRatio)
    : '--';
  const adBadgeColor = selectedExchange ? adColor(selectedExchange.advanceDecline.adRatio) : 'text-neutral-600';

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-mono">
      {/* Header */}
      <div className="shrink-0 border-b border-neutral-800">
        {/* Top row: title + badge + refresh */}
        <div className="flex items-center justify-between px-2 py-1 bg-black">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-tight text-orange-400">
              {tr(t, 'panelMarketInternals', 'MARKET INTERNALS')}
            </span>
            <span className={`text-[8px] font-bold px-1 border border-neutral-800 ${adBadgeColor}`}>
              A/D {adBadge}
            </span>
          </div>
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral-600 hover:text-orange-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* View tabs + exchange selector */}
        <div className="flex items-center justify-between px-1 py-0.5 bg-black">
          {/* View tabs */}
          <div className="flex">
            {views.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-tight transition-colors ${
                  view === v
                    ? 'text-orange-400 bg-orange-400/10'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          {/* Exchange selector */}
          <div className="flex">
            {exchanges.map((ex) => (
              <button
                key={ex}
                onClick={() => setExchange(ex)}
                className={`px-1.5 py-0.5 text-[7px] font-mono uppercase tracking-tight transition-colors ${
                  exchange === ex
                    ? 'text-orange-400 bg-orange-400/10'
                    : 'text-neutral-600 hover:text-neutral-400'
                }`}
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-4 h-4 border-2 border-orange-400/30 border-t-orange-400 animate-spin" />
              <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">
                {tr(t, 'loading', 'LOADING')}
              </span>
            </div>
          </div>
        ) : selectedExchange ? (
          <>
            {view === 'BREADTH' && <BreadthView data={selectedExchange} t={t} />}
            {view === 'OSCILLATORS' && <OscillatorsView data={selectedExchange} t={t} />}
            {view === 'TREND' && <TrendView data={selectedExchange} history={data?.history ?? []} t={t} />}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[9px] font-mono text-neutral-600 uppercase">
            {tr(t, 'marketInternalsNoData', 'NO DATA AVAILABLE')}
          </div>
        )}
      </div>

      {/* Footer */}
      {data && (
        <div className="shrink-0 flex items-center justify-center px-2 py-0.5 border-t border-neutral-800 bg-black">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'marketInternalsGenerated', 'GENERATED')} {new Date(data.generatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
