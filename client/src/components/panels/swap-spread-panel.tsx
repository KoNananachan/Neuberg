import { useSwapSpread } from '../../api/hooks/use-swap-spread';
import { RefreshCw } from 'lucide-react';

// ── Formatting helpers ──

function fmtRate(n: number): string {
  return `${n.toFixed(3)}%`;
}

function fmtBp(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtBpUnsigned(n: number): string {
  return n.toFixed(1);
}

// ── Color helpers ──

function changeColor(n: number): string {
  if (n > 0) return 'text-amber-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function changeColorStrong(n: number): string {
  if (n > 2) return 'text-red-400';
  if (n > 0) return 'text-amber-400';
  if (n < -2) return 'text-emerald-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

function spreadColor(n: number): string {
  if (n < 0) return 'text-fuchsia-400';
  if (n > 30) return 'text-amber-400';
  return 'text-white';
}

function rateChangeColor(n: number): string {
  if (n > 0) return 'text-red-400';
  if (n < 0) return 'text-green-400';
  return 'text-neutral-500';
}

// ── 52W Range Bar ──

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low || 1;
  const pct = Math.max(0, Math.min(100, ((current - low) / range) * 100));
  return (
    <div className="flex items-center gap-1">
      <span className="text-[7px] font-mono text-neutral-600 w-6 text-right">{fmtBpUnsigned(low)}</span>
      <div className="flex-1 h-1 bg-neutral-800 relative min-w-[24px]">
        <div
          className="absolute top-0 left-0 h-full bg-teal-400/40"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-[-1px] w-[2px] h-[6px] bg-teal-400"
          style={{ left: `${pct}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral-600 w-6 text-right">{fmtBpUnsigned(high)}</span>
    </div>
  );
}

// ── Section Header ──

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-2 py-1 border-b border-border/20 bg-teal-400/[0.03]">
      <span className="text-[8px] font-mono font-black uppercase tracking-wider text-teal-400">
        {title}
      </span>
    </div>
  );
}

// ── Table Header Row ──

function TableHeaderRow({ cols }: { cols: { label: string; align?: string; flex?: string }[] }) {
  return (
    <div className="flex px-2 py-0.5 border-b border-border/20 bg-[#030303]">
      {cols.map((col) => (
        <span
          key={col.label}
          className={`text-[7px] font-mono font-black text-neutral-500 uppercase tracking-wider ${col.flex ?? 'flex-1'} ${col.align === 'left' ? 'text-left' : 'text-right'}`}
        >
          {col.label}
        </span>
      ))}
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const items = [
    { label: 'USD 2s10s', value: summary.usd2s10s, accent: true },
    { label: 'EUR 2s10s', value: summary.eur2s10s },
    { label: 'Avg USD', value: summary.avgUsdSpread },
    { label: 'Trend', value: summary.trend, isTrend: true },
    { label: 'Widest', value: summary.widestBasis, isWide: true },
    { label: 'Tightest', value: summary.tightestBasis, isTight: true },
  ];

  return (
    <div className="grid grid-cols-6 gap-px bg-border/10 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1 bg-black">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {item.label}
          </div>
          <div
            className={`text-[10px] font-mono font-bold ${
              item.isTrend
                ? item.value === 'WIDENING'
                  ? 'text-amber-400'
                  : item.value === 'TIGHTENING'
                    ? 'text-green-400'
                    : 'text-neutral-400'
                : item.isWide
                  ? 'text-amber-400'
                  : item.isTight
                    ? 'text-green-400'
                    : item.accent
                      ? 'text-teal-400'
                      : 'text-white'
            }`}
          >
            {item.isTrend
              ? (item.value ?? '--')
              : typeof item.value === 'number'
                ? `${fmtBp(item.value)}bp`
                : '--'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Overnight Rates ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OvernightRates({ rates }: { rates: any[] }) {
  if (!rates || rates.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Overnight Reference Rates" />
      <div className="grid grid-cols-5 gap-px bg-border/10 shrink-0">
        {rates.map((r: { name: string; rate: number; change: number }) => (
          <div key={r.name} className="px-2 py-1 bg-black">
            <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
              {r.name}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] font-mono font-bold text-white">
                {fmtRate(r.rate)}
              </span>
              <span className={`text-[8px] font-mono ${rateChangeColor(r.change)}`}>
                {fmtBp(r.change)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Swap Spread Table (generic for all currencies) ──

function SwapSpreadTable({
  title,
  benchmarkLabel,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows,
}: {
  title: string;
  benchmarkLabel: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[];
}) {
  if (!rows || rows.length === 0) return null;

  return (
    <div>
      <SectionHeader title={title} />
      <TableHeaderRow
        cols={[
          { label: 'Tenor', align: 'left', flex: 'w-12' },
          { label: 'Swap', flex: 'flex-1' },
          { label: benchmarkLabel, flex: 'flex-1' },
          { label: 'Sprd', flex: 'w-12' },
          { label: '1D', flex: 'w-10' },
          { label: '1W', flex: 'w-10' },
          { label: '1M', flex: 'w-10' },
          { label: '52W Range', flex: 'flex-[1.4]' },
        ]}
      />
      {rows.map((row: {
        tenor: string;
        swapRate: number;
        benchmarkYield: number;
        spread: number;
        chg1d: number;
        chg1w: number;
        chg1m: number;
        low52w: number;
        high52w: number;
      }, i: number) => (
        <div
          key={row.tenor}
          className={`flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-teal-400 w-12">{row.tenor}</span>
          <span className="text-[9px] font-mono text-white text-right flex-1">{fmtRate(row.swapRate)}</span>
          <span className="text-[9px] font-mono text-white text-right flex-1">{fmtRate(row.benchmarkYield)}</span>
          <span className={`text-[9px] font-mono font-bold text-right w-12 ${spreadColor(row.spread)}`}>
            {fmtBp(row.spread)}
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColorStrong(row.chg1d)}`}>
            {fmtBp(row.chg1d)}
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColor(row.chg1w)}`}>
            {fmtBp(row.chg1w)}
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColor(row.chg1m)}`}>
            {fmtBp(row.chg1m)}
          </span>
          <div className="flex-[1.4]">
            <RangeBar low={row.low52w} high={row.high52w} current={row.spread} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Cross-Currency Basis Swaps ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrossCurrencyBasis({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Cross-Currency Basis Swaps" />
      <TableHeaderRow
        cols={[
          { label: 'Pair', align: 'left', flex: 'w-16' },
          { label: 'Tenor', flex: 'w-10' },
          { label: 'Basis', flex: 'flex-1' },
          { label: '1D', flex: 'w-10' },
          { label: '1W', flex: 'w-10' },
          { label: '1M', flex: 'w-10' },
        ]}
      />
      {rows.map((row: {
        pair: string;
        tenor: string;
        basis: number;
        chg1d: number;
        chg1w: number;
        chg1m: number;
      }, i: number) => (
        <div
          key={`${row.pair}-${row.tenor}`}
          className={`flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-teal-400 w-16">{row.pair}</span>
          <span className="text-[9px] font-mono text-neutral-400 w-10 text-right">{row.tenor}</span>
          <span className={`text-[9px] font-mono font-bold text-right flex-1 ${spreadColor(row.basis)}`}>
            {fmtBp(row.basis)}bp
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColor(row.chg1d)}`}>
            {fmtBp(row.chg1d)}
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColor(row.chg1w)}`}>
            {fmtBp(row.chg1w)}
          </span>
          <span className={`text-[8px] font-mono text-right w-10 ${changeColor(row.chg1m)}`}>
            {fmtBp(row.chg1m)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Forward Rates ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ForwardRates({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div>
      <SectionHeader title="Forward Rates" />
      <TableHeaderRow
        cols={[
          { label: 'Tenor', align: 'left', flex: 'w-14' },
          { label: 'Rate', flex: 'flex-1' },
          { label: 'Implied Chg', flex: 'flex-1' },
        ]}
      />
      {rows.map((row: {
        tenor: string;
        rate: number;
        impliedChange: number;
      }, i: number) => (
        <div
          key={row.tenor}
          className={`flex items-center px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold text-teal-400 w-14">{row.tenor}</span>
          <span className="text-[9px] font-mono text-white text-right flex-1">{fmtRate(row.rate)}</span>
          <span className={`text-[9px] font-mono font-bold text-right flex-1 ${changeColor(row.impliedChange)}`}>
            {fmtBp(row.impliedChange)}bp
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Main Panel ──

export function SwapSpreadPanel() {
  const { data, isLoading, error, refetch } = useSwapSpread();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-mono font-black uppercase tracking-wider text-teal-400">
            Swap Spread Monitor
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Loading state */}
      {isLoading && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-teal-400 uppercase tracking-wider animate-pulse">
            Loading...
          </span>
        </div>
      )}

      {/* Error state */}
      {error && !data && (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[9px] font-mono text-red-400 uppercase tracking-wider">
            Failed to load swap spread data
          </span>
        </div>
      )}

      {/* Data content */}
      {data && (
        <div className="flex-1 overflow-auto no-scrollbar">
          {/* Summary bar */}
          <SummaryBar data={data} />

          {/* Overnight rates */}
          <OvernightRates rates={data.overnightRates} />

          {/* USD Swap Spreads */}
          <SwapSpreadTable
            title="USD Swap Spreads vs Treasury"
            benchmarkLabel="Tsy"
            rows={data.usdSpreads}
          />

          {/* EUR Swap Spreads */}
          <SwapSpreadTable
            title="EUR Swap Spreads vs Bund"
            benchmarkLabel="Bund"
            rows={data.eurSpreads}
          />

          {/* GBP Swap Spreads */}
          <SwapSpreadTable
            title="GBP Swap Spreads vs Gilt"
            benchmarkLabel="Gilt"
            rows={data.gbpSpreads}
          />

          {/* JPY Swap Spreads */}
          <SwapSpreadTable
            title="JPY Swap Spreads vs JGB"
            benchmarkLabel="JGB"
            rows={data.jpySpreads}
          />

          {/* Cross-Currency Basis */}
          <CrossCurrencyBasis rows={data.crossCurrencyBasis} />

          {/* Forward Rates */}
          <ForwardRates rows={data.forwardRates} />

          {/* Timestamp footer */}
          {data.timestamp && (
            <div className="px-2 py-1 border-t border-border/10">
              <span className="text-[7px] font-mono text-neutral-700">
                Updated: {new Date(data.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
