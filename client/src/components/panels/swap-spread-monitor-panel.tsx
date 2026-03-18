import { useState } from 'react';
import { useSwapSpreadMonitor } from '../../api/hooks/use-swap-spread-monitor';
import { RefreshCw } from 'lucide-react';

type Tab = 'spreads' | 'historical' | 'butterfly' | 'crossCcy';

const ACCENT = '#38bdf8';
const ACCENT_DIM = 'rgba(56,189,248,0.08)';
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'] as const;

// ── Formatting helpers ──

function fmtBp(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtRate(n: number): string {
  return `${n.toFixed(3)}%`;
}

function fmtZScore(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

function spreadColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeColor(n: number): string {
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function zScoreColor(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 2) return 'text-red-400';
  if (abs >= 1) return 'text-yellow-400';
  return 'text-neutral-400';
}

function signalStyle(signal: string): { text: string; bg: string } {
  if (signal === 'Steep') return { text: 'text-green-400', bg: 'bg-green-500/10 border border-green-500/30' };
  if (signal === 'Flat') return { text: 'text-red-400', bg: 'bg-red-500/10 border border-red-500/30' };
  return { text: 'text-neutral-400', bg: 'bg-neutral-500/10 border border-neutral-500/30' };
}

// ── Tab labels ──

const TAB_LABELS: Record<Tab, string> = {
  spreads: 'Spreads',
  historical: 'Historical',
  butterfly: 'Butterfly',
  crossCcy: 'Cross-Ccy',
};

// ── Main Panel ──

export function SwapSpreadMonitorPanel() {
  const [tab, setTab] = useState<Tab>('spreads');
  const { data, isLoading, refetch } = useSwapSpreadMonitor();

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ backgroundColor: ACCENT }} />
          <span
            className="text-[9px] font-black font-mono uppercase tracking-tighter"
            style={{ color: ACCENT }}
          >
            Swap Spread Monitor
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral-500 hover:text-sky-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {data && <SummaryBar data={data} />}

      {/* Tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['spreads', 'historical', 'butterfly', 'crossCcy'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              tab === t
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-sky-400 text-[9px] font-mono uppercase animate-pulse">
            Loading...
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            No data available
          </div>
        )}

        {data && tab === 'spreads' && <SpreadsTab data={data} />}
        {data && tab === 'historical' && <HistoricalTab data={data} />}
        {data && tab === 'butterfly' && <ButterflyTab data={data} />}
        {data && tab === 'crossCcy' && <CrossCcyTab data={data} />}
      </div>
    </div>
  );
}

// ── Summary Bar ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SummaryBar({ data }: { data: any }) {
  const summary = data?.summary;
  if (!summary) return null;

  const items = [
    { label: 'USD 10Y', value: summary.usd10y, accent: true },
    { label: 'EUR 10Y', value: summary.eur10y, accent: false },
    { label: 'GBP 10Y', value: summary.gbp10y, accent: false },
    { label: 'JPY 10Y', value: summary.jpy10y, accent: false },
    { label: 'Avg 1D Chg', value: summary.avg1dChg, isChange: true },
  ];

  return (
    <div className="grid grid-cols-5 gap-px bg-border/10 border-b border-border/20 shrink-0">
      {items.map((item) => (
        <div key={item.label} className="px-2 py-1.5 bg-black">
          <div className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider">
            {item.label}
          </div>
          <div
            className={`text-[10px] font-mono font-bold ${
              item.isChange
                ? item.value >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
                : item.accent
                  ? ''
                  : 'text-white'
            }`}
            style={item.accent && !item.isChange ? { color: ACCENT } : undefined}
          >
            {item.isChange ? fmtBp(item.value) + 'bp' : fmtBp(item.value) + 'bp'}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Spreads Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SpreadsTab({ data }: { data: any }) {
  const [filter, setFilter] = useState<string>('ALL');
  const spreads = data?.spreads ?? [];

  const currencies = ['ALL', ...CURRENCIES];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filtered = filter === 'ALL' ? spreads : spreads.filter((s: any) => s.currency === filter);

  // Group by currency
  const grouped = new Map<string, typeof filtered>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of filtered) {
    const ccy = row.currency as string;
    if (!grouped.has(ccy)) grouped.set(ccy, []);
    grouped.get(ccy)!.push(row);
  }

  return (
    <div>
      {/* Currency filter */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-border/20">
        {currencies.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border transition-colors ${
              filter === c
                ? 'border-sky-400 text-sky-400 bg-sky-400/10'
                : 'border-border/30 text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.8fr_0.8fr_0.7fr_0.6fr_0.6fr_0.9fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Tenor</span>
        <span className="text-right">Swap Rate</span>
        <span className="text-right">Tsy Rate</span>
        <span className="text-right">Spread</span>
        <span className="text-right">1D Chg</span>
        <span className="text-right">1W Chg</span>
        <span className="text-right">Percentile</span>
      </div>

      {/* Rows grouped by currency */}
      {Array.from(grouped.entries()).map(([ccy, rows]) => (
        <div key={ccy}>
          {/* Group header */}
          <div className="px-3 py-1 border-b border-border/10" style={{ backgroundColor: ACCENT_DIM }}>
            <span className="text-[8px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT }}>
              {ccy}
            </span>
          </div>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {rows.map((row: any, i: number) => (
            <div
              key={`${ccy}-${row.tenor}`}
              className={`grid grid-cols-[0.6fr_0.8fr_0.8fr_0.7fr_0.6fr_0.6fr_0.9fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors ${
                i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
              }`}
            >
              <span className="text-[9px] font-mono font-bold text-white">{row.tenor}</span>
              <span className="text-[9px] font-mono text-white text-right">{fmtRate(row.swapRate)}</span>
              <span className="text-[9px] font-mono text-white text-right">{fmtRate(row.treasuryRate)}</span>
              <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.spread)}`}>
                {fmtBp(row.spread)}
              </span>
              <span className={`text-[9px] font-mono text-right ${changeColor(row.chg1d)}`}>
                {fmtBp(row.chg1d)}
              </span>
              <span className={`text-[9px] font-mono text-right ${changeColor(row.chg1w)}`}>
                {fmtBp(row.chg1w)}
              </span>
              <div className="flex items-center gap-1 justify-end">
                <div className="w-12 h-1.5 bg-neutral-800 relative">
                  <div
                    className="absolute top-0 left-0 h-full bg-sky-400/60"
                    style={{ width: `${Math.min(Math.max(row.percentile, 0), 100)}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono text-neutral-400 w-7 text-right">
                  {row.percentile}%
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No spread data
        </div>
      )}
    </div>
  );
}

// ── Historical Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HistoricalTab({ data }: { data: any }) {
  const historical = data?.historical ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          10Y Swap Spread Historical Range
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.7fr_0.6fr_0.6fr_0.6fr_0.9fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Currency</span>
        <span className="text-right">Current</span>
        <span className="text-right">Low 1Y</span>
        <span className="text-right">High 1Y</span>
        <span className="text-right">Mean 1Y</span>
        <span className="text-right">Percentile</span>
        <span className="text-right">Z-Score</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {historical.map((row: any, i: number) => (
        <div
          key={row.currency}
          className={`grid grid-cols-[0.6fr_0.7fr_0.6fr_0.6fr_0.6fr_0.9fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {row.currency}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.current)}`}>
            {fmtBp(row.current)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtBp(row.low1y)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtBp(row.high1y)}
          </span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">
            {fmtBp(row.mean1y)}
          </span>
          <div className="flex items-center gap-1 justify-end">
            <div className="w-12 h-1.5 bg-neutral-800 relative">
              <div
                className="absolute top-0 left-0 h-full bg-sky-400/60"
                style={{ width: `${Math.min(Math.max(row.percentile, 0), 100)}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral-400 w-7 text-right">
              {row.percentile}%
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold text-right ${zScoreColor(row.zScore)}`}>
            {fmtZScore(row.zScore)}
          </span>
        </div>
      ))}

      {historical.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No historical data
        </div>
      )}
    </div>
  );
}

// ── Butterfly Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ButterflyTab({ data }: { data: any }) {
  const butterfly = data?.butterfly ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Butterfly Spread Analysis
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.8fr_0.8fr_0.6fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Currency</span>
        <span className="text-right">2s5s10s</span>
        <span className="text-right">5s10s30s</span>
        <span className="text-right">1D Chg</span>
        <span className="text-right">Signal</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {butterfly.map((row: any, i: number) => {
        const sig = signalStyle(row.signal);
        return (
          <div
            key={row.currency}
            className={`grid grid-cols-[0.6fr_0.8fr_0.8fr_0.6fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors ${
              i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
            }`}
          >
            <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
              {row.currency}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.fly2s5s10s)}`}>
              {fmtBp(row.fly2s5s10s)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.fly5s10s30s)}`}>
              {fmtBp(row.fly5s10s30s)}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.chg1d)}`}>
              {fmtBp(row.chg1d)}
            </span>
            <div className="flex justify-end">
              <span
                className={`px-1.5 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider ${sig.text} ${sig.bg}`}
              >
                {row.signal}
              </span>
            </div>
          </div>
        );
      })}

      {butterfly.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No butterfly data
        </div>
      )}
    </div>
  );
}

// ── Cross-Currency Tab ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrossCcyTab({ data }: { data: any }) {
  const crossCcy = data?.crossCcy ?? [];

  return (
    <div>
      {/* Section header */}
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[8px] font-black font-mono uppercase tracking-wider text-neutral-500">
          Cross-Currency Spread Comparison
        </span>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[0.6fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral-500 uppercase tracking-wider">
        <span>Tenor</span>
        <span className="text-right">USD</span>
        <span className="text-right">EUR</span>
        <span className="text-right">GBP</span>
        <span className="text-right">JPY</span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {crossCcy.map((row: any, i: number) => (
        <div
          key={row.tenor}
          className={`grid grid-cols-[0.6fr_0.7fr_0.7fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors ${
            i % 2 === 0 ? 'bg-black' : 'bg-white/[0.01]'
          }`}
        >
          <span className="text-[9px] font-mono font-bold" style={{ color: ACCENT }}>
            {row.tenor}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.usd)}`}>
            {fmtBp(row.usd)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.eur)}`}>
            {fmtBp(row.eur)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.gbp)}`}>
            {fmtBp(row.gbp)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${spreadColor(row.jpy)}`}>
            {fmtBp(row.jpy)}
          </span>
        </div>
      ))}

      {crossCcy.length === 0 && (
        <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
          No cross-currency data
        </div>
      )}
    </div>
  );
}
