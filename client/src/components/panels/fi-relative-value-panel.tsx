import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useFiRelativeValue } from '../../api/hooks/use-fi-relative-value';
import { useT, tr, TFn } from '../../i18n';


// ── Tabs ──

type Tab = 'butterfly' | 'swapSpreads' | 'crossMarket' | 'otrOfr' | 'breakevens';

const TABS: { key: Tab; label: string }[] = [
  { key: 'butterfly', label: 'BUTTERFLY' },
  { key: 'swapSpreads', label: 'SWAP SPREADS' },
  { key: 'crossMarket', label: 'CROSS-MARKET' },
  { key: 'otrOfr', label: 'OTR/OFR' },
  { key: 'breakevens', label: 'BREAKEVENS' },
];

// ── Formatting helpers ──

function fmtYield(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(3)}%`;
}

function fmtSpread(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return n.toFixed(1);
}

function fmtBps(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  return `${n.toFixed(1)}%`;
}

function fmtZscore(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '-';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

// ── Color helpers ──

function changeColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n > 0) return 'text-green-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function richCheapColor(v: string | number | null | undefined): string {
  if (v == null) return 'text-neutral-500';
  if (typeof v === 'number') {
    if (v > 0) return 'text-green-400';
    if (v < 0) return 'text-red-400';
    return 'text-neutral-500';
  }
  const s = v.toLowerCase();
  if (s === 'rich') return 'text-red-400';
  if (s === 'cheap') return 'text-green-400';
  return 'text-yellow-400';
}

function zscoreColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (Math.abs(n) >= 2) return n > 0 ? 'text-green-400' : 'text-red-400';
  if (Math.abs(n) >= 1) return n > 0 ? 'text-green-400/70' : 'text-red-400/70';
  return 'text-neutral-400';
}

function spreadLevelColor(n: number | null | undefined): string {
  if (n == null) return 'text-neutral-500';
  if (n < -20) return 'text-red-400';
  if (n < 0) return 'text-red-400/70';
  if (n > 20) return 'text-green-400';
  if (n > 0) return 'text-green-400/70';
  return 'text-neutral-400';
}

function signalBadge(signal: string | null | undefined): { text: string; bg: string } {
  const s = (signal ?? '').toUpperCase();
  if (s === 'WIDE') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s === 'TIGHT') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'FAIR') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  if (s === 'RICH') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  if (s === 'CHEAP') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'BUY' || s === 'LONG') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (s === 'SELL' || s === 'SHORT') return { text: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' };
  return { text: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' };
}

function convictionBadge(conv: string | null | undefined): { text: string; bg: string } {
  const c = (conv ?? '').toLowerCase();
  if (c === 'high') return { text: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' };
  if (c === 'medium') return { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' };
  return { text: 'text-zinc-400', bg: 'bg-zinc-500/10 border-zinc-500/30' };
}

// ── Z-Score bar (inline visual) ──

function ZscoreBar({ value }: { value: number | null | undefined }) {
  if (value == null || isNaN(value as number)) return <span className="text-neutral-600">-</span>;
  const clamped = Math.max(-3, Math.min(3, value));
  const pct = ((clamped + 3) / 6) * 100;
  const barColor = Math.abs(value) >= 2
    ? (value > 0 ? '#4ade80' : '#f87171')
    : Math.abs(value) >= 1
      ? (value > 0 ? '#4ade8080' : '#f8717180')
      : '#fbbf2460';
  return (
    <div className="relative w-full h-[6px] bg-neutral-800/50">
      <div className="absolute top-0 left-1/2 w-px h-full bg-neutral-700" />
      <div
        className="absolute top-0 h-full"
        style={{
          left: value >= 0 ? '50%' : `${pct}%`,
          width: `${Math.abs(pct - 50)}%`,
          backgroundColor: barColor,
        }}
      />
    </div>
  );
}

// ── Percentile bar (inline visual) ──

function PercentileBar({ value }: { value: number | null | undefined }) {
  if (value == null || isNaN(value as number)) return <span className="text-neutral-600">-</span>;
  const pct = Math.max(0, Math.min(100, value));
  const barColor = pct > 80 ? '#f87171' : pct > 60 ? '#fbbf24' : pct > 40 ? '#71717a' : pct > 20 ? '#fbbf24' : '#4ade80';
  return (
    <div className="relative w-full h-[6px] bg-neutral-800/50">
      <div
        className="absolute top-0 left-0 h-full"
        style={{ width: `${pct}%`, backgroundColor: barColor }}
      />
    </div>
  );
}

// ── Main Panel ──

export function FiRelativeValuePanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useFiRelativeValue();
  const [activeTab, setActiveTab] = useState<Tab>('butterfly');

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        <span className="text-[9px] font-mono text-amber-400/70 uppercase tracking-widest">
          LOADING RV DATA...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-2">
        <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest">
          FAILED TO LOAD
        </div>
        <button
          onClick={() => refetch()}
          className="text-[8px] font-mono text-amber-400 uppercase tracking-wider border border-amber-400/30 px-2 py-0.5 hover:bg-amber-400/[0.06] transition-colors"
        >
          {tr(t, 'firvRetry', 'Retry')}
        </button>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const butterflies: any[] = data.butterflies ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const swapSpreads: any[] = data.swapSpreads ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crossMarket: any[] = data.crossMarket ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const otrOfr: any[] = data.otrOfr ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const breakevens: any[] = data.breakevens ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recommendations: any[] = data.recommendations ?? [];

  return (
    <div className="h-full flex flex-col bg-black text-white overflow-hidden">
      {/* Tab Bar */}
      <div className="flex items-center gap-0 border-b border-border/20 bg-[#030303] shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 text-[7px] font-black font-mono uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === tab.key
                ? 'text-amber-400 border-amber-400 bg-amber-400/[0.04]'
                : 'text-neutral-500 border-transparent hover:text-neutral-300 hover:bg-amber-400/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {activeTab === 'butterfly' && <ButterflyTab rows={butterflies} t={t} />}
        {activeTab === 'swapSpreads' && <SwapSpreadsTab rows={swapSpreads} t={t} />}
        {activeTab === 'crossMarket' && <CrossMarketTab rows={crossMarket} t={t} />}
        {activeTab === 'otrOfr' && <OtrOfrTab rows={otrOfr} t={t} />}
        {activeTab === 'breakevens' && <BreakevensTab rows={breakevens} t={t} />}

        {/* Trade Recommendations */}
        {recommendations.length > 0 && (
          <RecommendationsSection rows={recommendations} t={t} />
        )}
      </div>
    </div>
  );
}

// ── Tab 1: Butterfly ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ButterflyTab({ rows, t }: { rows: any[]; t: TFn }) {
  if (rows.length === 0) return <EmptyState label="No butterfly data" />;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'firvButterfly', 'Butterfly Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_48px_48px_52px_52px_56px_48px_48px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Name</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Body</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Wings</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Fair</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">R/C</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">Z-Score</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Carry</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">Signal</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const sig = signalBadge(row.signal);
        return (
          <div
            key={row.name ?? i}
            className="grid grid-cols-[1fr_48px_48px_52px_52px_56px_48px_48px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{row.name ?? '-'}</span>
            <span className="text-[9px] font-mono text-amber-400/80 text-right">{row.bodyTenor ?? '-'}</span>
            <span className="text-[9px] font-mono text-neutral-500 text-right">{row.wingTenor ?? '-'}</span>
            <span className="text-[9px] font-mono font-bold text-white text-right">{fmtBps(row.currentSpread)}</span>
            <span className="text-[9px] font-mono text-neutral-500 text-right">{fmtBps(row.fairValue)}</span>
            <div className="flex justify-center">
              <span className={`text-[9px] font-mono font-bold ${richCheapColor(row.richCheap)}`}>
                {typeof row.richCheap === 'number' ? fmtBps(row.richCheap) : (row.richCheap ?? '-')}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 items-center">
              <span className={`text-[8px] font-mono font-bold ${zscoreColor(row.zscore)}`}>
                {fmtZscore(row.zscore)}
              </span>
              <ZscoreBar value={row.zscore} />
            </div>
            <span className="text-[9px] font-mono text-green-400/70 text-right">{fmtBps(row.carry)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal ?? '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 2: Swap Spreads ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SwapSpreadsTab({ rows, t }: { rows: any[]; t: TFn }) {
  if (rows.length === 0) return <EmptyState label="No swap spread data" />;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'firvSwapSpreads', 'Swap Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[52px_60px_60px_56px_48px_48px_52px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Tsy Yld</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Swap Rate</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">1W Chg</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">%ile</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">Signal</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const sig = signalBadge(row.signal);
        return (
          <div
            key={row.tenor ?? i}
            className="grid grid-cols-[52px_60px_60px_56px_48px_48px_52px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.treasuryYield)}</span>
            <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.swapRate)}</span>
            <span className={`text-[9px] font-mono font-bold text-right ${spreadLevelColor(row.swapSpread)}`}>
              {fmtSpread(row.swapSpread)}
            </span>
            <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.change)}`}>
              {fmtBps(row.change)}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.weekChange)}`}>
              {fmtBps(row.weekChange)}
            </span>
            <div className="flex flex-col gap-0.5 items-center">
              <span className="text-[8px] font-mono text-neutral-400">{fmtPct(row.percentile)}</span>
              <PercentileBar value={row.percentile} />
            </div>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal ?? '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 3: Cross-Market ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CrossMarketTab({ rows, t }: { rows: any[]; t: TFn }) {
  if (rows.length === 0) return <EmptyState label="No cross-market data" />;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'firvCrossMarket', 'Cross-Market Spreads')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[1fr_56px_48px_48px_52px_56px_52px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Pair</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Spread</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">Z-Score</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Hist Avg</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">Signal</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => {
        const sig = signalBadge(row.signal);
        return (
          <div
            key={row.pair ?? i}
            className="grid grid-cols-[1fr_56px_48px_48px_52px_56px_52px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
          >
            <span className="text-[9px] font-mono font-bold text-white truncate">{row.pair ?? '-'}</span>
            <span className="text-[9px] font-mono font-bold text-white text-right">{fmtBps(row.spread)}</span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.change1d)}`}>
              {fmtBps(row.change1d)}
            </span>
            <span className={`text-[9px] font-mono text-right ${changeColor(row.change1w)}`}>
              {fmtBps(row.change1w)}
            </span>
            <div className="flex flex-col gap-0.5 items-center">
              <span className={`text-[8px] font-mono font-bold ${zscoreColor(row.zscore)}`}>
                {fmtZscore(row.zscore)}
              </span>
              <ZscoreBar value={row.zscore} />
            </div>
            <span className="text-[9px] font-mono text-neutral-500 text-right">{fmtBps(row.historicalAvg)}</span>
            <div className="flex justify-center">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {row.signal ?? '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab 4: OTR/OFR ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OtrOfrTab({ rows, t }: { rows: any[]; t: TFn }) {
  if (rows.length === 0) return <EmptyState label="No OTR/OFR data" />;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'firvOtrOfr', 'On-The-Run vs Off-The-Run')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[52px_60px_60px_56px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">OTR Yld</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">OFR Yld</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Rich (bps)</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Liq Prem</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => (
        <div
          key={row.tenor ?? i}
          className="grid grid-cols-[52px_60px_60px_56px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.otrYield)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.ofrYield)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.richness)}`}>
            {fmtBps(row.richness)}
          </span>
          <span className="text-[9px] font-mono text-amber-400/70 text-right">{fmtBps(row.liquidityPremium)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab 5: Breakevens ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BreakevensTab({ rows, t }: { rows: any[]; t: TFn }) {
  if (rows.length === 0) return <EmptyState label="No breakeven data" />;

  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500">
          {tr(t, 'firvBreakevens', 'TIPS Breakevens')}
        </span>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[48px_60px_60px_56px_48px_52px_56px] gap-0 px-2 py-0.5 border-b border-border/10 bg-[#030303]">
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider">Tenor</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Nominal</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Real</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">B/E</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Chg</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-right">Fair</span>
        <span className="text-[7px] font-black font-mono text-neutral-600 uppercase tracking-wider text-center">R/C</span>
      </div>

      {/* Rows */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((row: any, i: number) => (
        <div
          key={row.tenor ?? i}
          className="grid grid-cols-[48px_60px_60px_56px_48px_52px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors items-center"
        >
          <span className="text-[9px] font-mono font-bold text-white">{row.tenor ?? '-'}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.nominalYield)}</span>
          <span className="text-[9px] font-mono text-neutral-400 text-right">{fmtYield(row.realYield)}</span>
          <span className="text-[9px] font-mono font-bold text-amber-400 text-right">{fmtYield(row.breakeven)}</span>
          <span className={`text-[9px] font-mono font-bold text-right ${changeColor(row.change)}`}>
            {fmtBps(row.change)}
          </span>
          <span className="text-[9px] font-mono text-neutral-500 text-right">{fmtYield(row.fairValue)}</span>
          <div className="flex justify-center">
            <span className={`text-[9px] font-mono font-bold ${richCheapColor(row.richCheap)}`}>
              {typeof row.richCheap === 'number' ? fmtBps(row.richCheap) : (row.richCheap ?? '-')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Trade Recommendations ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RecommendationsSection({ rows, t }: { rows: any[]; t: TFn }) {
  return (
    <div className="border-b border-border/20">
      <div className="px-3 py-1 border-b border-border/10">
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-amber-400">
          {tr(t, 'firvRecommendations', 'Trade Recommendations')}
        </span>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {rows.map((rec: any, i: number) => {
        const sig = signalBadge(rec.direction);
        const conv = convictionBadge(rec.conviction);
        return (
          <div
            key={rec.trade ?? i}
            className="px-3 py-2 border-b border-border/5 hover:bg-amber-400/[0.02] transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${sig.text} ${sig.bg}`}>
                {rec.direction ?? '-'}
              </span>
              <span className="text-[9px] font-mono font-bold text-white truncate">{rec.trade ?? '-'}</span>
              <span className={`px-1 py-px text-[6px] font-mono font-black uppercase border ${conv.text} ${conv.bg}`}>
                {rec.conviction ?? '-'}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <div className="text-[7px] font-mono text-neutral-600 uppercase">Entry</div>
                <div className="text-[8px] font-mono text-white">{fmtBps(rec.entry)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-600 uppercase">Target</div>
                <div className="text-[8px] font-mono text-amber-400">{fmtBps(rec.target)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-600 uppercase">Stop</div>
                <div className="text-[8px] font-mono text-red-400/70">{fmtBps(rec.stop)}</div>
              </div>
              <div>
                <div className="text-[7px] font-mono text-neutral-600 uppercase">Horizon</div>
                <div className="text-[8px] font-mono text-neutral-400">{rec.horizon ?? '-'}</div>
              </div>
            </div>
            {rec.rationale && (
              <div className="mt-1 text-[8px] font-mono text-neutral-500 leading-tight">{rec.rationale}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Empty State ──

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <span className="text-[9px] font-mono text-neutral-600 uppercase tracking-widest">{label}</span>
    </div>
  );
}
