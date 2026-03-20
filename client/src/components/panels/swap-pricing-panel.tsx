import { useState } from 'react';
import { useSwapPricing } from '../../api/hooks/use-swap-pricing';
import { useT, tr, TFn } from '../../i18n';

// ── Types (local, no imports from hook) ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwapPricingData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwapCurveRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValuationData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForwardRateRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SwapSpreadRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BasisSwapRow = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RiskBucket = any;

// ── Currency tabs ──

type Currency = 'USD' | 'EUR' | 'GBP' | 'JPY';
const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'JPY'];

// ── Formatting helpers ──

function fmtRate(n: number | null | undefined): string {
  if (n == null) return '--';
  return n.toFixed(3);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtCompact(n: number | null | undefined): string {
  if (n == null) return '--';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e9) return sign + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + (abs / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return '--';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1e9) return sign + '$' + (abs / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
  return (n < 0 ? '-$' : '$') + abs.toFixed(2);
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function pnlColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function spreadColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n != null && n > 20) return 'text-red-400';
  if (n != null && n > 10) return 'text-yellow-400';
  if (n != null && n < -10) return 'text-blue-400';
  return 'text-neutral-400';
}

// ── Main Panel ──

export function SwapPricingPanel() {
  const t = useT();
  const { data, isLoading, error } = useSwapPricing();
  const d = data as SwapPricingData;
  const [activeCcy, setActiveCcy] = useState<Currency>('USD');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'panelSwapPricing', 'Swap Pricer')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {d?.asOfDate && (
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {d.asOfDate}
            </span>
          )}
          {d?.valuationCcy && (
            <span className="text-[7px] font-mono text-lime-400/60 uppercase tracking-wider">
              {d.valuationCcy}
            </span>
          )}
        </div>
      </div>

      {/* Currency tabs */}
      <div className="flex border-b border-border/20 shrink-0">
        {CURRENCIES.map((ccy) => (
          <button
            key={ccy}
            onClick={() => setActiveCcy(ccy)}
            className={`flex-1 py-1 text-[7px] font-black font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeCcy === ccy
                ? 'border-lime-400 text-lime-400 bg-lime-400/[0.04]'
                : 'border-transparent text-neutral-600 hover:text-neutral-400'
            }`}
          >
            {ccy}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !d && (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !d && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            FAILED TO LOAD SWAP DATA
          </div>
        )}

        {!d && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            NO DATA AVAILABLE
          </div>
        )}

        {d && (
          <>
            <SwapCurveSection d={d} ccy={activeCcy} t={t} />
            <ValuationSection d={d} ccy={activeCcy} t={t} />
            <ForwardRatesSection d={d} ccy={activeCcy} t={t} />
            <SwapSpreadsSection d={d} ccy={activeCcy} t={t} />
            <BasisSwapsSection d={d} ccy={activeCcy} t={t} />
            <RiskSensitivitiesSection d={d} ccy={activeCcy} t={t} />
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// 1. Swap Curve Table
// ────────────────────────────────────────────────────

function SwapCurveSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const rows: SwapCurveRow[] = d?.swapCurve?.[ccy] ?? d?.swapCurve ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {ccy} {tr(t, 'spSwapCurve', 'IRS Curve')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_56px_52px_52px_44px_44px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spMid', 'Mid %')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spBid', 'Bid')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spAsk', 'Ask')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1D
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1W
        </span>
      </div>

      {/* Rows */}
      {rows.map((r: SwapCurveRow, i: number) => (
        <div
          key={r?.tenor ?? i}
          className="grid grid-cols-[48px_56px_52px_52px_44px_44px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase">
            {r?.tenor}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(r?.mid)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(r?.bid)}
          </span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtRate(r?.ask)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r?.change1d)}`}>
            {fmtBps(r?.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(r?.change1w)}`}>
            {fmtBps(r?.change1w)}
          </span>
        </div>
      ))}

      {rows.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 2. Sample Valuation
// ────────────────────────────────────────────────────

function ValuationSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const val: ValuationData = d?.valuation?.[ccy] ?? d?.valuation;
  if (!val) return null;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {tr(t, 'spValuation', 'Swap Valuation')}
        </span>
      </div>

      {/* Swap details strip */}
      <div className="grid grid-cols-4 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spNotional', 'Notional')}
          </div>
          <div className="text-[9px] font-mono font-bold text-white">
            {fmtCompact(val?.notional)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spFixedRate', 'Fixed Rate')}
          </div>
          <div className="text-[9px] font-mono font-bold text-lime-400">
            {fmtRate(val?.fixedRate)}%
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spFloatIdx', 'Float Index')}
          </div>
          <div className="text-[9px] font-mono font-bold text-white">
            {val?.floatIndex ?? '--'}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spMaturity', 'Maturity')}
          </div>
          <div className="text-[9px] font-mono font-bold text-white">
            {val?.maturity ?? '--'}
          </div>
        </div>
      </div>

      {/* Leg PVs and NPV */}
      <div className="grid grid-cols-2 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spFixedLegPV', 'Fixed Leg PV')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${pnlColor(val?.fixedLegPV)}`}>
            {fmtCurrency(val?.fixedLegPV)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spFloatLegPV', 'Float Leg PV')}
          </div>
          <div className={`text-[10px] font-mono font-bold ${pnlColor(val?.floatLegPV)}`}>
            {fmtCurrency(val?.floatLegPV)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            NPV
          </div>
          <div className={`text-[11px] font-mono font-black ${pnlColor(val?.npv)}`}>
            {fmtCurrency(val?.npv)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            DV01
          </div>
          <div className="text-[11px] font-mono font-black text-lime-400">
            {fmtCurrency(val?.dv01)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spParRate', 'Par Rate')}
          </div>
          <div className="text-[11px] font-mono font-black text-white">
            {val?.parRate != null ? fmtRate(val.parRate) + '%' : '--'}
          </div>
        </div>
      </div>

      {/* Accrued interest */}
      {val?.accruedInterest != null && (
        <div className="px-3 py-1 border-t border-border/10 flex items-center justify-between">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spAccrued', 'Accrued Interest')}
          </span>
          <span className="text-[8px] font-mono font-bold text-neutral-400">
            {fmtCurrency(val.accruedInterest)}
          </span>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 3. Forward Rates (SOFR Forward Curve)
// ────────────────────────────────────────────────────

function ForwardRatesSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const forwards: ForwardRateRow[] = d?.forwardRates?.[ccy] ?? d?.forwardRates ?? [];

  const indexLabel =
    ccy === 'USD'
      ? 'SOFR'
      : ccy === 'EUR'
        ? 'ESTR'
        : ccy === 'GBP'
          ? 'SONIA'
          : ccy === 'JPY'
            ? 'TONAR'
            : 'OIS';

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {indexLabel} {tr(t, 'spForwardCurve', 'Forward Curve')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_64px_56px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spPeriod', 'Period')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spFwdRate', 'Fwd Rate')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spImplied', 'Implied')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1D
        </span>
      </div>

      {/* Rows */}
      {forwards.map((f: ForwardRateRow, i: number) => (
        <div
          key={f?.period ?? f?.name ?? i}
          className="grid grid-cols-[1fr_64px_56px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {f?.period ?? f?.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-white text-right">
            {fmtRate(f?.rate)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f?.impliedMove)}`}>
            {fmtBps(f?.impliedMove)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(f?.change1d ?? f?.change)}`}>
            {fmtBps(f?.change1d ?? f?.change)}
          </span>
        </div>
      ))}

      {forwards.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 4. Swap Spreads to Treasury
// ────────────────────────────────────────────────────

function SwapSpreadsSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const spreads: SwapSpreadRow[] = d?.swapSpreads?.[ccy] ?? d?.swapSpreads ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {tr(t, 'spSwapSpreads', 'Swap Spreads vs Treasury')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[48px_56px_56px_48px_1fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spTenor', 'Tenor')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spSpread', 'Sprd bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spTsyYld', 'Tsy Yld')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1D
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
          {tr(t, 'spBar', 'Spread')}
        </span>
      </div>

      {/* Rows */}
      {spreads.map((s: SwapSpreadRow, i: number) => {
        const absSpread = Math.abs(s?.spread ?? 0);
        const maxSpread = Math.max(
          ...spreads.map((x: SwapSpreadRow) => Math.abs(x?.spread ?? 0)),
          1,
        );
        const barPct = (absSpread / maxSpread) * 100;
        const isNeg = (s?.spread ?? 0) < 0;

        return (
          <div
            key={s?.tenor ?? i}
            className="grid grid-cols-[48px_56px_56px_48px_1fr] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
          >
            <span className="text-[8px] font-mono font-bold text-white uppercase">
              {s?.tenor}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${spreadColor(s?.spread)}`}>
              {fmtBps(s?.spread)}
            </span>
            <span className="text-[8px] font-mono font-bold text-white text-right">
              {fmtRate(s?.tsyYield)}
            </span>
            <span className={`text-[8px] font-mono font-bold text-right ${changeColor(s?.change)}`}>
              {fmtBps(s?.change)}
            </span>
            <div className="flex items-center justify-end pr-1">
              <div className="w-full h-2 bg-white/[0.02] relative">
                <div
                  className="absolute top-0 h-full"
                  style={{
                    width: `${barPct.toFixed(1)}%`,
                    background: isNeg
                      ? 'rgba(96,165,250,0.3)'
                      : 'rgba(163,230,53,0.25)',
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}

      {spreads.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 5. Basis Swaps
// ────────────────────────────────────────────────────

function BasisSwapsSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const basis: BasisSwapRow[] = d?.basisSwaps?.[ccy] ?? d?.basisSwaps ?? [];

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {tr(t, 'spBasisSwaps', 'Basis Swaps')}
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
          {tr(t, 'spInstrument', 'Instrument')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {tr(t, 'spBasis', 'Basis bps')}
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1D
        </span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
          {'\u0394'}1W
        </span>
      </div>

      {/* Rows */}
      {basis.map((b: BasisSwapRow, i: number) => (
        <div
          key={b?.name ?? i}
          className="grid grid-cols-[1fr_56px_48px_48px] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white uppercase truncate">
            {b?.name}
          </span>
          <span className="text-[8px] font-mono font-bold text-lime-400 text-right">
            {fmtBps(b?.basis)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b?.change1d)}`}>
            {fmtBps(b?.change1d)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(b?.change1w)}`}>
            {fmtBps(b?.change1w)}
          </span>
        </div>
      ))}

      {basis.length === 0 && (
        <div className="px-3 py-2 text-[7px] font-mono text-neutral-600 uppercase">
          NO DATA
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────
// 6. Risk Sensitivities
// ────────────────────────────────────────────────────

function RiskSensitivitiesSection({
  d,
  ccy,
  t,
}: {
  d: SwapPricingData;
  ccy: Currency;
  t: ReturnType<typeof useT>;
}) {
  const risk = d?.riskSensitivities?.[ccy] ?? d?.riskSensitivities;
  if (!risk) return null;

  const buckets: RiskBucket[] = risk?.dv01Buckets ?? [];
  const maxAbsDV01 = Math.max(
    ...buckets.map((b: RiskBucket) => Math.abs(b?.dv01 ?? 0)),
    1,
  );

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10 bg-[#030303]">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-lime-400">
          {tr(t, 'spRiskSensitivities', 'Risk Sensitivities')}
        </span>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-3 gap-px bg-border/10">
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spTotalDV01', 'Total DV01')}
          </div>
          <div className="text-[11px] font-mono font-black text-lime-400">
            {fmtCurrency(risk?.totalDV01)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spGamma', 'Gamma')}
          </div>
          <div className="text-[11px] font-mono font-black text-purple-400">
            {fmtCurrency(risk?.gamma)}
          </div>
        </div>
        <div className="bg-black px-2 py-1.5">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {tr(t, 'spTheta', 'Theta')}
          </div>
          <div className="text-[11px] font-mono font-black text-amber-400">
            {risk?.theta != null ? fmtCurrency(risk.theta) + '/d' : '--'}
          </div>
        </div>
      </div>

      {/* DV01 by bucket header */}
      {buckets.length > 0 && (
        <>
          <div className="px-3 py-0.5 border-b border-border/10 border-t border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'spDV01Buckets', 'DV01 by Bucket')}
            </span>
          </div>

          <div className="grid grid-cols-[48px_64px_1fr] gap-0 px-3 py-0.5 border-b border-border/10 bg-[#030303]">
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {tr(t, 'spTenor', 'Tenor')}
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">
              DV01
            </span>
            <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">
              {tr(t, 'spDistrib', 'Distribution')}
            </span>
          </div>

          {/* DV01 bucket rows */}
          {buckets.map((b: RiskBucket, i: number) => {
            const barPct = (Math.abs(b?.dv01 ?? 0) / maxAbsDV01) * 100;
            const isPos = (b?.dv01 ?? 0) >= 0;

            return (
              <div
                key={b?.tenor ?? i}
                className="grid grid-cols-[48px_64px_1fr] gap-0 px-3 py-[3px] border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors items-center"
              >
                <span className="text-[8px] font-mono font-bold text-white uppercase">
                  {b?.tenor}
                </span>
                <span className={`text-[8px] font-mono font-bold text-right ${pnlColor(b?.dv01)}`}>
                  {fmtCurrency(b?.dv01)}
                </span>
                <div className="flex items-center justify-end pr-1">
                  <div className="w-full h-2.5 bg-white/[0.02] relative">
                    <div
                      className="absolute top-0 h-full"
                      style={{
                        width: `${(barPct / 2).toFixed(1)}%`,
                        left: isPos ? '50%' : undefined,
                        right: isPos ? undefined : '50%',
                        background: isPos
                          ? 'rgba(163,230,53,0.3)'
                          : 'rgba(248,113,113,0.3)',
                      }}
                    />
                    <div
                      className="absolute top-0 h-full w-px bg-neutral-700"
                      style={{ left: '50%' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* Additional risk metrics */}
      {(risk?.convexity != null || risk?.cr01 != null || risk?.krd != null) && (
        <div className="grid grid-cols-3 gap-px bg-border/10 border-t border-border/10">
          {risk?.convexity != null && (
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'spConvexity', 'Convexity')}
              </div>
              <div className="text-[9px] font-mono font-bold text-white">
                {risk.convexity.toFixed(4)}
              </div>
            </div>
          )}
          {risk?.cr01 != null && (
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                CR01
              </div>
              <div className="text-[9px] font-mono font-bold text-white">
                {fmtCurrency(risk.cr01)}
              </div>
            </div>
          )}
          {risk?.krd != null && (
            <div className="bg-black px-2 py-1.5">
              <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
                {tr(t, 'spKRD', 'Key Rate Dur')}
              </div>
              <div className="text-[9px] font-mono font-bold text-white">
                {risk.krd.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timestamp */}
      {d?.timestamp && (
        <div className="px-3 py-1 border-t border-border/10">
          <span className="text-[7px] font-mono text-neutral-700">
            {tr(t, 'spUpdated', 'Updated')}: {new Date(d.timestamp).toLocaleTimeString()}
          </span>
        </div>
      )}
    </div>
  );
}
