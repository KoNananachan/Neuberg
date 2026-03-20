import { useIndexArbitrage } from '../../api/hooks/use-index-arbitrage';
import { useT, tr, TFn } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── Local types (data from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisSummary = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EtfRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ArbOpportunity = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HistoricalBasis = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ProgramSignal = any;

// ── Formatting helpers ──

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals);
}

function fmtPct(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(decimals) + '%';
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(1) + 'bp';
}

function fmtPts(n: number | null | undefined): string {
  if (n == null) return '--';
  return (n >= 0 ? '+' : '') + n.toFixed(2) + ' pts';
}

function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDays(n: number | null | undefined): string {
  if (n == null) return '--';
  return String(n) + 'd';
}

// ── Color helpers ──

function basisColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-400';
}

function premDiscColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0.05) return 'text-green-400';
  if (n < -0.05) return 'text-red-400';
  return 'text-neutral-400';
}

function riskBadge(level: string | null | undefined): string {
  const l = (level ?? '').toUpperCase();
  if (l === 'LOW') return 'bg-green-400/15 text-green-400 border-green-400/30';
  if (l === 'MEDIUM' || l === 'MED') return 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30';
  if (l === 'HIGH') return 'bg-red-400/15 text-red-400 border-red-400/30';
  return 'bg-neutral-400/15 text-neutral-400 border-neutral-400/30';
}

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-400';
}

// ── Text sparkline helper ──

function textSparkline(values: number[]): string {
  if (!values || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const bars = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values
    .map((v) => {
      const idx = Math.round(((v - min) / range) * (bars.length - 1));
      return bars[idx];
    })
    .join('');
}

// ── Bar visualization helper ──

function barWidth(value: number, maxAbs: number): number {
  if (maxAbs === 0) return 0;
  return Math.min(Math.abs(value / maxAbs) * 100, 100);
}

// ── Main Panel ──

export function IndexArbitragePanel() {
  const t = useT();
  const { data, isLoading, error } = useIndexArbitrage();

  const keyBasis = data?.keyBasis as BasisSummary[] | undefined;
  const basisTable = data?.basisTable as BasisRow[] | undefined;
  const etfPremDisc = data?.etfPremiumDiscount as EtfRow[] | undefined;
  const arbOpps = data?.arbitrageOpportunities as ArbOpportunity[] | undefined;
  const historicalBasis = data?.historicalBasis as HistoricalBasis | undefined;
  const programSignals = data?.programSignals as ProgramSignal[] | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-yellow-400/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-yellow-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-yellow-400">
            {tr(t, 'panelIndexArbitrage', 'Index Arbitrage Monitor')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.timestamp && (
            <span className="text-[7px] font-mono text-neutral-600">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => data}
            className="p-1 text-neutral-500 hover:text-yellow-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto no-scrollbar">
        {/* Loading state */}
        {isLoading && !data && (
          <div className="text-center py-8 text-yellow-400 text-[9px] font-mono uppercase animate-pulse">
            LOADING INDEX ARBITRAGE DATA...
          </div>
        )}

        {/* Error state */}
        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'iarbError', 'Error loading data')}
          </div>
        )}

        {/* Empty state */}
        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'iarbNoData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            {/* Key Basis Displays */}
            {keyBasis && keyBasis.length > 0 && <KeyBasisBar items={keyBasis} t={t} />}

            {/* Basis Table */}
            {basisTable && basisTable.length > 0 && <BasisTableSection rows={basisTable} t={t} />}

            {/* ETF Premium/Discount */}
            {etfPremDisc && etfPremDisc.length > 0 && <EtfPremDiscSection rows={etfPremDisc} t={t} />}

            {/* Arbitrage Opportunities */}
            {arbOpps && arbOpps.length > 0 && <ArbOpportunitiesSection rows={arbOpps} t={t} />}

            {/* Historical Basis Sparkline */}
            {historicalBasis && <HistoricalBasisSection data={historicalBasis} t={t} />}

            {/* Program Trading Signals */}
            {programSignals && programSignals.length > 0 && (
              <ProgramSignalsSection signals={programSignals} t={t} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Key Basis Displays (SPX/ES, NDX/NQ, RTY/RTY) ──

function KeyBasisBar({
  items,
  t,
}: {
  items: BasisSummary[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30 bg-[#030303]">
      <div className="flex items-center gap-0 divide-x divide-yellow-400/10">
        {items.map((item: BasisSummary, i: number) => {
          const basis = item?.basis as number | undefined;
          const label = item?.label ?? item?.pair ?? `Pair ${i + 1}`;
          const basisBps = item?.basisBps as number | undefined;
          const status = (item?.status ?? '').toUpperCase();

          return (
            <div key={`kb-${i}`} className="flex-1 px-3 py-2 text-center">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {label}
              </div>
              <div className={`text-[13px] font-mono font-black tabular-nums ${basisColor(basis)}`}>
                {fmtPts(basis)}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                {basisBps != null && (
                  <span className={`text-[7px] font-mono ${basisColor(basisBps)}`}>
                    {fmtBps(basisBps)}
                  </span>
                )}
                {status && (
                  <span
                    className={`px-1 py-px text-[6px] font-mono font-black uppercase tracking-wider border ${
                      status === 'PREMIUM'
                        ? 'bg-green-400/15 text-green-400 border-green-400/30'
                        : status === 'DISCOUNT'
                          ? 'bg-red-400/15 text-red-400 border-red-400/30'
                          : 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
                    }`}
                  >
                    {status}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Basis Table: Index vs Futures ──

function BasisTableSection({
  rows,
  t,
}: {
  rows: BasisRow[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'iarbBasisTable', 'Index vs Futures Basis')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_64px_56px_52px_52px_48px_44px_40px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'iarbIndex', 'Index')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbCash', 'Cash')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbFutures', 'Futures')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbFairVal', 'Fair Val')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbBasisPts', 'Basis')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbBasisBps', 'Bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbCarry', 'Carry')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbDivYld', 'Div%')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbDte', 'DTE')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: BasisRow, i: number) => (
        <div
          key={`basis-${i}`}
          className="grid grid-cols-[1fr_64px_64px_56px_52px_52px_48px_44px_40px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
              {row?.index ?? '--'}
            </span>
            {row?.futuresContract && (
              <span className="text-[6px] font-mono text-neutral-600 truncate">
                {row.futuresContract}
              </span>
            )}
          </div>
          <span className="text-[8px] font-mono font-bold text-white text-right tabular-nums">
            {fmtPrice(row?.cashLevel)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
            {fmtPrice(row?.futuresLevel)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
            {fmtPrice(row?.fairValue)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${basisColor(row?.basisPts)}`}>
            {fmtPts(row?.basisPts)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${basisColor(row?.basisBps)}`}>
            {fmtBps(row?.basisBps)}
          </span>
          <span className={`text-[8px] font-mono text-right tabular-nums ${changeColor(row?.carry)}`}>
            {fmtNum(row?.carry, 3)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right tabular-nums">
            {row?.dividendYield != null ? fmtNum(row.dividendYield, 2) + '%' : '--'}
          </span>
          <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
            {fmtDays(row?.daysToExpiry)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── ETF Premium/Discount ──

function EtfPremDiscSection({
  rows,
  t,
}: {
  rows: EtfRow[];
  t: ReturnType<typeof useT>;
}) {
  const maxAbsPremDisc = Math.max(
    ...rows.map((r: EtfRow) => Math.abs(r?.premiumDiscount ?? 0)),
    0.01
  );

  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'iarbEtfPremDisc', 'ETF Premium / Discount')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[56px_60px_60px_48px_1fr] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'iarbEtf', 'ETF')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbNav', 'NAV')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbPrice', 'Price')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbPremDisc', 'P/D')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider pl-2">
          {tr(t, 'iarbBar', '')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: EtfRow, i: number) => {
        const pd = row?.premiumDiscount as number | undefined;
        const w = barWidth(pd ?? 0, maxAbsPremDisc);
        const isPositive = (pd ?? 0) >= 0;

        return (
          <div
            key={`etf-${i}`}
            className="grid grid-cols-[56px_60px_60px_48px_1fr] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
              {row?.ticker ?? '--'}
            </span>
            <span className="text-[8px] font-mono text-neutral-300 text-right tabular-nums">
              {row?.nav != null ? '$' + fmtNum(row.nav) : '--'}
            </span>
            <span className="text-[8px] font-mono text-white font-bold text-right tabular-nums">
              {row?.price != null ? '$' + fmtNum(row.price) : '--'}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${premDiscColor(pd)}`}>
              {fmtPct(pd, 3)}
            </span>
            {/* Bar visualization */}
            <div className="flex items-center h-3 pl-2">
              <div className="relative w-full h-2 bg-neutral-900">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-neutral-700" />
                <div
                  className={`absolute top-0 h-full ${isPositive ? 'bg-green-400/40' : 'bg-red-400/40'}`}
                  style={{
                    left: isPositive ? '50%' : `${50 - w / 2}%`,
                    width: `${w / 2}%`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Arbitrage Opportunities ──

function ArbOpportunitiesSection({
  rows,
  t,
}: {
  rows: ArbOpportunity[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'iarbOpportunities', 'Arbitrage Opportunities')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_56px_44px_36px] gap-0 px-2 py-0.5 border-b border-yellow-400/5 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'iarbPair', 'Pair')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbSpread', 'Spread')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbExpProfit', 'Exp P&L')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbRisk', 'Risk')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'iarbRank', '#')}
        </span>
      </div>

      {/* Rows */}
      {rows.map((row: ArbOpportunity, i: number) => (
        <div
          key={`arb-${i}`}
          className="grid grid-cols-[1fr_60px_56px_44px_36px] gap-0 px-2 py-[3px] border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors items-center"
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-mono font-bold text-yellow-400 truncate">
              {row?.pair ?? '--'}
            </span>
            {row?.strategy && (
              <span className="text-[6px] font-mono text-neutral-600 truncate">
                {row.strategy}
              </span>
            )}
          </div>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${basisColor(row?.spread)}`}>
            {fmtPts(row?.spread)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right tabular-nums ${changeColor(row?.expectedProfit)}`}>
            {row?.expectedProfit != null ? fmtPct(row.expectedProfit) : '--'}
          </span>
          <div className="flex justify-end">
            <span
              className={`px-1 py-px text-[6px] font-mono font-black uppercase tracking-wider border ${riskBadge(row?.riskLevel)}`}
            >
              {(row?.riskLevel ?? '--').toUpperCase().slice(0, 3)}
            </span>
          </div>
          <span className="text-[8px] font-mono text-neutral-500 text-right tabular-nums">
            {row?.rank ?? i + 1}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Historical Basis Sparkline ──

function HistoricalBasisSection({
  data,
  t,
}: {
  data: HistoricalBasis;
  t: ReturnType<typeof useT>;
}) {
  const values = data?.values as number[] | undefined;
  const dates = data?.dates as string[] | undefined;
  const min = values && values.length > 0 ? Math.min(...values) : null;
  const max = values && values.length > 0 ? Math.max(...values) : null;
  const latest = values && values.length > 0 ? values[values.length - 1] : null;
  const sparkline = values ? textSparkline(values) : '';

  return (
    <div className="border-b border-yellow-400/30">
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'iarbHistBasis', 'SPX/ES Basis — 20 Day History')}
        </span>
      </div>

      <div className="px-3 py-2">
        {/* Sparkline */}
        <div className={`text-[11px] font-mono tracking-[1px] leading-none ${basisColor(latest)}`}>
          {sparkline || '--'}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Low</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${basisColor(min)}`}>
              {fmtPts(min)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">High</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${basisColor(max)}`}>
              {fmtPts(max)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] font-mono text-neutral-600 uppercase">Current</span>
            <span className={`text-[8px] font-mono font-bold tabular-nums ${basisColor(latest)}`}>
              {fmtPts(latest)}
            </span>
          </div>
          {dates && dates.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-[6px] font-mono text-neutral-700">
                {dates[0]} — {dates[dates.length - 1]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Program Trading Signals ──

function ProgramSignalsSection({
  signals,
  t,
}: {
  signals: ProgramSignal[];
  t: ReturnType<typeof useT>;
}) {
  return (
    <div>
      <div className="px-3 py-1 border-b border-yellow-400/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'iarbProgSignals', 'Program Trading Signals')}
        </span>
      </div>

      {signals.map((sig: ProgramSignal, i: number) => {
        const buyThreshold = sig?.buyThreshold as number | undefined;
        const sellThreshold = sig?.sellThreshold as number | undefined;
        const currentBasis = sig?.currentBasis as number | undefined;
        const distBuy = buyThreshold != null && currentBasis != null ? currentBasis - buyThreshold : null;
        const distSell = sellThreshold != null && currentBasis != null ? sellThreshold - currentBasis : null;

        // Calculate position for distance-to-trigger bar
        const rangeLow = sellThreshold ?? 0;
        const rangeHigh = buyThreshold ?? 0;
        const rangeSpan = rangeHigh - rangeLow || 1;
        const currentPosPercent =
          currentBasis != null
            ? Math.max(0, Math.min(100, ((currentBasis - rangeLow) / rangeSpan) * 100))
            : 50;

        return (
          <div
            key={`sig-${i}`}
            className="px-3 py-2 border-b border-yellow-400/5 hover:bg-yellow-400/[0.02] transition-colors"
          >
            {/* Label row */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-[8px] font-mono font-bold text-yellow-400">
                {sig?.label ?? sig?.index ?? `Signal ${i + 1}`}
              </span>
              <span className={`text-[8px] font-mono font-bold tabular-nums ${basisColor(currentBasis)}`}>
                {fmtPts(currentBasis)}
              </span>
            </div>

            {/* Distance-to-trigger bar */}
            <div className="relative w-full h-3 bg-neutral-900 mb-1">
              {/* Sell zone */}
              <div className="absolute left-0 top-0 h-full bg-red-400/10" style={{ width: '20%' }} />
              {/* Buy zone */}
              <div className="absolute right-0 top-0 h-full bg-green-400/10" style={{ width: '20%' }} />
              {/* Current position indicator */}
              <div
                className="absolute top-0 h-full w-0.5 bg-yellow-400"
                style={{ left: `${currentPosPercent}%` }}
              />
              {/* Threshold markers */}
              <div className="absolute top-0 h-full w-px bg-red-400/50" style={{ left: '20%' }} />
              <div className="absolute top-0 h-full w-px bg-green-400/50" style={{ left: '80%' }} />
            </div>

            {/* Threshold labels */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-[6px] font-mono text-red-400/70 uppercase">Sell</span>
                <span className="text-[7px] font-mono text-red-400 tabular-nums">
                  {fmtPts(sellThreshold)}
                </span>
                {distSell != null && (
                  <span className="text-[6px] font-mono text-neutral-600">
                    ({fmtPts(distSell)} away)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {distBuy != null && (
                  <span className="text-[6px] font-mono text-neutral-600">
                    ({fmtPts(distBuy)} away)
                  </span>
                )}
                <span className="text-[7px] font-mono text-green-400 tabular-nums">
                  {fmtPts(buyThreshold)}
                </span>
                <span className="text-[6px] font-mono text-green-400/70 uppercase">Buy</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
