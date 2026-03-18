import { useMemo } from 'react';
import { useCurrencyBasket } from '../../api/hooks/use-currency-basket';
import { useT } from '../../i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CurrencyBasketData = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DxyComponent = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CurrencyStrengthEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReerEntry = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CustomBasket = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TwiEntry = any;

const tr = (t: ReturnType<typeof useT>, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── DXY component weights (ICE methodology) ──

const DXY_WEIGHTS: Record<string, number> = {
  EUR: 57.6,
  JPY: 13.6,
  GBP: 11.9,
  CAD: 9.1,
  SEK: 4.2,
  CHF: 3.6,
};

const DXY_COLORS: Record<string, string> = {
  EUR: '#34d399',
  JPY: '#60a5fa',
  GBP: '#f472b6',
  CAD: '#fb923c',
  SEK: '#a78bfa',
  CHF: '#fbbf24',
};

// ── Format helpers ──

function fmtNum(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '---';
  return n.toFixed(decimals);
}

function fmtPct(n: number | undefined | null, decimals = 2): string {
  if (n == null || isNaN(n)) return '---';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(decimals)}%`;
}

function changeColor(n: number | undefined | null): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function strengthBarColor(value: number): string {
  if (value >= 50) return '#34d399';
  if (value >= 20) return '#4ade80';
  if (value >= 0) return '#a3a3a3';
  if (value >= -20) return '#fb923c';
  if (value >= -50) return '#f87171';
  return '#ef4444';
}

function reerSignalColor(signal: string | undefined | null): string {
  if (!signal) return 'text-neutral-500';
  const s = signal.toUpperCase();
  if (s.includes('OVER')) return 'text-red-400';
  if (s.includes('UNDER')) return 'text-green-400';
  return 'text-neutral-400';
}

function basketChangeColor(n: number | undefined | null): { text: string; bg: string } {
  if (n == null) return { text: 'text-neutral-500', bg: 'bg-neutral-800' };
  if (n > 0) return { text: 'text-green-400', bg: 'bg-green-500/10' };
  if (n < 0) return { text: 'text-red-400', bg: 'bg-red-500/10' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-800' };
}

// ── Sparkline generator (text-based 30-day) ──

function textSparkline(values: number[] | undefined | null): string {
  if (!values || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const blocks = ['\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];
  return values
    .map((v) => {
      const idx = Math.min(Math.floor(((v - min) / range) * (blocks.length - 1)), blocks.length - 1);
      return blocks[idx];
    })
    .join('');
}

// ── Main Panel ──

export function CurrencyBasketPanel() {
  const t = useT();
  const { data: rawData, isLoading, error } = useCurrencyBasket();
  const data = rawData as CurrencyBasketData | undefined;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-wider text-emerald-400">
            {tr(t, 'panelCurrencyBasket', 'CURRENCY BASKET / DXY')}
          </span>
        </div>
        {data?.timestamp && (
          <span className="text-[7px] font-mono text-neutral-600">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-emerald-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {error && !data && (
          <div className="text-center py-8 text-red-400 text-[9px] font-mono uppercase">
            {tr(t, 'error', 'Error loading data')}
          </div>
        )}

        {!data && !isLoading && !error && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'noData', 'No data available')}
          </div>
        )}

        {data && (
          <>
            <DxyHeader data={data} />
            <DxyDecomposition components={data?.dxyComponents} />
            <CurrencyStrengthMeter currencies={data?.currencyStrength} />
            <ReerSection entries={data?.reer} />
            <CustomBaskets baskets={data?.customBaskets} />
            <TradeWeightedIndices indices={data?.twi} />
            <DxySparklineSection values={data?.dxyHistory} level={data?.dxyLevel} />
          </>
        )}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1 border-t border-border/20 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral-600">
          BCUR
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          {data ? `${data?.currencyStrength?.length ?? 0} ccy` : '---'}
        </span>
      </div>
    </div>
  );
}

// ── DXY Level Header ──

function DxyHeader({ data }: { data: CurrencyBasketData }) {
  const level = data?.dxyLevel;
  const change1d = data?.dxyChange1d;

  return (
    <div className="px-3 py-2 border-b border-border/20">
      <div className="flex items-baseline gap-3">
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            DXY INDEX
          </div>
          <div className="text-[22px] font-mono font-black text-white leading-none">
            {fmtNum(level, 3)}
          </div>
        </div>
        <div>
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            1D CHG
          </div>
          <div className={`text-[14px] font-mono font-black leading-none ${changeColor(change1d)}`}>
            {fmtPct(change1d, 3)}
          </div>
        </div>
        {data?.dxyHigh != null && data?.dxyLow != null && (
          <div className="ml-auto text-right">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              H / L
            </div>
            <div className="text-[9px] font-mono text-neutral-400">
              {fmtNum(data.dxyHigh, 2)} / {fmtNum(data.dxyLow, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── DXY Decomposition ──

function DxyDecomposition({ components }: { components: DxyComponent[] | undefined }) {
  const items = useMemo(() => {
    if (!components?.length) {
      return Object.entries(DXY_WEIGHTS).map(([ccy, weight]) => ({
        currency: ccy,
        weight,
        contribution: 0,
        change: 0,
      }));
    }
    return components;
  }, [components]);

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          DXY DECOMPOSITION
        </span>
      </div>

      {/* Stacked bar */}
      <div className="px-3 py-1.5">
        <div className="flex h-3 w-full overflow-hidden">
          {items.map((c: DxyComponent) => {
            const w = c?.weight ?? DXY_WEIGHTS[c?.currency] ?? 0;
            const color = DXY_COLORS[c?.currency] ?? '#525252';
            return (
              <div
                key={c?.currency}
                className="h-full relative group"
                style={{ width: `${w}%`, backgroundColor: color, opacity: 0.7 }}
                title={`${c?.currency}: ${w}%`}
              >
                {w > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[6px] font-mono font-black text-black">
                    {c?.currency}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {/* Legend row */}
        <div className="flex flex-wrap gap-x-3 gap-y-0 mt-1">
          {items.map((c: DxyComponent) => (
            <div key={c?.currency} className="flex items-center gap-1">
              <div
                className="w-1.5 h-1.5"
                style={{ backgroundColor: DXY_COLORS[c?.currency] ?? '#525252' }}
              />
              <span className="text-[7px] font-mono text-neutral-500">
                {c?.currency} {(c?.weight ?? DXY_WEIGHTS[c?.currency] ?? 0).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Component table */}
      <div className="px-2">
        {/* Table header */}
        <div className="grid grid-cols-[48px_52px_60px_52px_1fr] gap-0 px-1 py-0.5 border-b border-border/10 bg-[#030303]">
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CCY</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">WT%</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CONTRIB</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">CHG</span>
          <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right pr-1">BAR</span>
        </div>

        {/* Rows */}
        {items.map((c: DxyComponent) => {
          const weight = c?.weight ?? DXY_WEIGHTS[c?.currency] ?? 0;
          const contribution = c?.contribution ?? 0;
          const change = c?.change ?? 0;
          const barWidth = Math.min(Math.abs(contribution) * 20, 100);
          const barColor = contribution >= 0 ? 'bg-emerald-500' : 'bg-red-500';

          return (
            <div
              key={c?.currency}
              className="grid grid-cols-[48px_52px_60px_52px_1fr] gap-0 px-1 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
            >
              <span className="text-[8px] font-mono font-bold text-white flex items-center gap-1">
                <div
                  className="w-1 h-1"
                  style={{ backgroundColor: DXY_COLORS[c?.currency] ?? '#525252' }}
                />
                {c?.currency}
              </span>
              <span className="text-[8px] font-mono text-neutral-400 text-right">
                {weight.toFixed(1)}
              </span>
              <span className={`text-[8px] font-mono font-bold text-right ${changeColor(contribution)}`}>
                {fmtPct(contribution, 3)}
              </span>
              <span className={`text-[8px] font-mono text-right ${changeColor(change)}`}>
                {fmtPct(change, 2)}
              </span>
              <div className="flex justify-end pr-1">
                <div className="w-14 h-[3px] bg-neutral-800 relative">
                  <div
                    className={`absolute top-0 h-full ${barColor}`}
                    style={{
                      width: `${barWidth}%`,
                      left: contribution >= 0 ? '50%' : undefined,
                      right: contribution < 0 ? '50%' : undefined,
                    }}
                  />
                  <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-600" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Currency Strength Meter ──

function CurrencyStrengthMeter({ currencies }: { currencies: CurrencyStrengthEntry[] | undefined }) {
  const items = currencies ?? [];

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CURRENCY STRENGTH
        </span>
        <span className="text-[7px] font-mono text-neutral-600 ml-auto">-100 / +100</span>
      </div>

      <div className="px-3 py-1.5 space-y-[3px]">
        {items.map((c: CurrencyStrengthEntry) => {
          const value = c?.strength ?? 0;
          const color = strengthBarColor(value);
          const barPct = Math.abs(value);
          const isPositive = value >= 0;

          return (
            <div key={c?.currency} className="flex items-center gap-2 hover:bg-emerald-400/[0.02] px-1 py-[1px] transition-colors">
              {/* Currency label */}
              <span className="text-[8px] font-mono font-bold text-white w-7 shrink-0">
                {c?.currency}
              </span>

              {/* Bidirectional bar */}
              <div className="flex-1 h-[6px] bg-neutral-900 relative">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 w-px h-full bg-neutral-700" />
                {/* Bar */}
                <div
                  className="absolute top-0 h-full"
                  style={{
                    backgroundColor: color,
                    width: `${barPct / 2}%`,
                    left: isPositive ? '50%' : undefined,
                    right: !isPositive ? '50%' : undefined,
                    opacity: 0.8,
                  }}
                />
                {/* Tick marks */}
                <div className="absolute left-1/4 top-0 w-px h-full bg-neutral-800" />
                <div className="absolute left-3/4 top-0 w-px h-full bg-neutral-800" />
              </div>

              {/* Value */}
              <span
                className="text-[8px] font-mono font-bold w-8 text-right shrink-0"
                style={{ color }}
              >
                {value >= 0 ? '+' : ''}{fmtNum(value, 0)}
              </span>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-[7px] font-mono text-neutral-600 text-center py-2">
            No strength data
          </div>
        )}
      </div>
    </div>
  );
}

// ── REER Section ──

function ReerSection({ entries }: { entries: ReerEntry[] | undefined }) {
  const items = entries ?? [];

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          REER VALUATION
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[44px_60px_56px_56px_64px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">CCY</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">NOM</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">REER</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">DEV%</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">SIGNAL</span>
      </div>

      {/* Rows */}
      {items.map((e: ReerEntry) => (
        <div
          key={e?.currency}
          className="grid grid-cols-[44px_60px_56px_56px_64px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white">{e?.currency}</span>
          <span className="text-[8px] font-mono text-neutral-400 text-right">
            {fmtNum(e?.nominalRate, 4)}
          </span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtNum(e?.reer, 1)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(e?.deviation)}`}>
            {fmtPct(e?.deviation, 1)}
          </span>
          <span className={`text-[7px] font-mono font-black text-right uppercase ${reerSignalColor(e?.signal)}`}>
            {e?.signal ?? '---'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Custom Baskets (EM FX, Commodity FX, Funding FX) ──

function CustomBaskets({ baskets }: { baskets: CustomBasket[] | undefined }) {
  const items = baskets ?? [];

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          CUSTOM BASKETS
        </span>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/10">
        {items.map((b: CustomBasket) => {
          const style = basketChangeColor(b?.change);
          return (
            <div key={b?.name} className={`bg-black px-2 py-2 ${style.bg}`}>
              <div className="text-[7px] font-mono text-neutral-500 uppercase tracking-wider truncate">
                {b?.name}
              </div>
              <div className={`text-[12px] font-mono font-black leading-tight ${style.text}`}>
                {fmtNum(b?.level, 2)}
              </div>
              <div className={`text-[9px] font-mono font-bold ${style.text}`}>
                {fmtPct(b?.change, 2)}
              </div>
              {b?.components && (
                <div className="mt-1 text-[6px] font-mono text-neutral-600 truncate">
                  {(b.components as string[]).join(' ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Trade-Weighted Indices ──

function TradeWeightedIndices({ indices }: { indices: TwiEntry[] | undefined }) {
  const items = indices ?? [];

  if (items.length === 0) return null;

  return (
    <div className="border-b border-border/20">
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10 flex items-center gap-2">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          TRADE-WEIGHTED INDICES
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_60px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">INDEX</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">LEVEL</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-right">1W</span>
      </div>

      {/* Rows */}
      {items.map((idx: TwiEntry) => (
        <div
          key={idx?.name}
          className="grid grid-cols-[1fr_60px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <span className="text-[8px] font-mono font-bold text-white truncate">{idx?.name}</span>
          <span className="text-[8px] font-mono text-neutral-300 text-right">
            {fmtNum(idx?.level, 2)}
          </span>
          <span className={`text-[8px] font-mono font-bold text-right ${changeColor(idx?.change1d)}`}>
            {fmtPct(idx?.change1d, 2)}
          </span>
          <span className={`text-[8px] font-mono text-right ${changeColor(idx?.change1w)}`}>
            {fmtPct(idx?.change1w, 2)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── DXY 30-Day Sparkline ──

function DxySparklineSection({ values, level }: { values: number[] | undefined; level: number | undefined }) {
  const spark = useMemo(() => textSparkline(values), [values]);

  if (!spark) return null;

  const min = values ? Math.min(...values) : 0;
  const max = values ? Math.max(...values) : 0;

  return (
    <div className="px-3 py-2">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1 h-1 bg-emerald-400" />
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          DXY 30D
        </span>
        {level != null && (
          <span className="ml-auto text-[8px] font-mono font-bold text-emerald-400">
            {fmtNum(level, 2)}
          </span>
        )}
      </div>

      {/* Sparkline */}
      <div className="font-mono text-[11px] leading-none text-emerald-400/80 tracking-tighter break-all">
        {spark}
      </div>

      {/* Range */}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[7px] font-mono text-neutral-600">
          L: {fmtNum(min, 2)}
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          30 days
        </span>
        <span className="text-[7px] font-mono text-neutral-600">
          H: {fmtNum(max, 2)}
        </span>
      </div>
    </div>
  );
}
