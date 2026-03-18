import { useState, useMemo } from 'react';
import { useBenchmarkTracker } from '../../api/hooks/use-benchmark-tracker';
import { useT } from '../../i18n';
import { Activity, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────

type Tab = 'indices' | 'relative' | 'tracking' | 'sector';

// ── Helpers ──────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

function fmtNum(n: number): string {
  if (Math.abs(n) >= 10000) return n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (Math.abs(n) >= 100) return n.toFixed(2);
  return n.toFixed(2);
}

function fmtPct(n: number): string {
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function fmtVol(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(Math.round(n));
}

function pctColor(v: number): string {
  return v >= 0 ? 'text-bullish' : 'text-bearish';
}

function TrendIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-2.5 h-2.5 text-bullish" />;
  if (value < 0) return <TrendingDown className="w-2.5 h-2.5 text-bearish" />;
  return <Minus className="w-2.5 h-2.5 text-neutral/40" />;
}

// ── 52-Week Range Bar ────────────────────────────────────────────────

function RangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;
  return (
    <div className="flex items-center gap-1 min-w-[60px]">
      <span className="text-[7px] font-mono text-neutral/30">{fmtNum(low)}</span>
      <div className="flex-1 h-1 bg-white/[0.05] relative">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-400"
          style={{ left: `${Math.min(Math.max(pct, 0), 100)}%` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral/30">{fmtNum(high)}</span>
    </div>
  );
}

// ── Section: Global Indices ──────────────────────────────────────────

function IndicesSection({ data }: { data: ReturnType<typeof useBenchmarkTracker>['data'] }) {
  const t = useT();
  const indices = data?.indices ?? [];

  if (!indices.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.55fr_0.55fr_0.55fr_0.55fr_1fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">INDEX</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">LEVEL</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1D</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">1W</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">MTD</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">YTD</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-center">52W RANGE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">VOL</span>
      </div>

      {indices.map((idx: any) => (
        <div
          key={idx.symbol}
          className="grid grid-cols-[1.2fr_0.7fr_0.55fr_0.55fr_0.55fr_0.55fr_1fr_0.5fr] px-3 py-1 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-white truncate">{idx.name}</div>
            <div className="text-[7px] font-mono text-neutral/30 truncate">{idx.symbol}</div>
          </div>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmtNum(idx.level)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.daily)}`}>
            {fmtPct(idx.daily)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.weekly)}`}>
            {fmtPct(idx.weekly)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.mtd)}`}>
            {fmtPct(idx.mtd)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(idx.ytd)}`}>
            {fmtPct(idx.ytd)}
          </span>
          <RangeBar low={idx.low52w} high={idx.high52w} current={idx.level} />
          <span className="text-[8px] font-mono text-neutral/40 text-right">
            {fmtVol(idx.volume)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Section: Relative Performance ────────────────────────────────────

function RelativeSection({ data }: { data: ReturnType<typeof useBenchmarkTracker>['data'] }) {
  const t = useT();
  const spreads = data?.relativeSpreads ?? [];

  if (!spreads.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.5fr_0.4fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">SPREAD</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">VALUE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">CHG</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">Z-SCORE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-center">TREND</span>
      </div>

      {spreads.map((sp: any) => (
        <div
          key={sp.name}
          className="grid grid-cols-[1.4fr_0.6fr_0.6fr_0.5fr_0.4fr] px-3 py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-white truncate">{sp.name}</div>
            <div className="text-[7px] font-mono text-neutral/30 truncate">{sp.description}</div>
          </div>
          <span className="text-[9px] font-mono font-bold text-white text-right">
            {fmt(sp.value, 2)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(sp.change)}`}>
            {fmtPct(sp.change)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${
            Math.abs(sp.zScore) >= 2 ? 'text-amber-400' : pctColor(sp.zScore)
          }`}>
            {sp.zScore >= 0 ? '+' : ''}{fmt(sp.zScore, 1)}
          </span>
          <div className="flex justify-center">
            <TrendIcon value={sp.change} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Tracking Analysis ───────────────────────────────────────

function TrackingSection({ data }: { data: ReturnType<typeof useBenchmarkTracker>['data'] }) {
  const t = useT();
  const etfs = data?.trackingAnalysis ?? [];

  if (!etfs.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">ETF</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">NAV</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">PRICE</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">PREM/DISC</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">TRACK ERR</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">R-SQ</span>
      </div>

      {etfs.map((etf: any) => {
        const premColor = etf.premiumDiscount >= 0 ? 'text-bullish' : 'text-bearish';
        const premLabel = etf.premiumDiscount >= 0 ? 'PREM' : 'DISC';

        return (
          <div
            key={etf.symbol}
            className="grid grid-cols-[1.2fr_0.7fr_0.6fr_0.6fr_0.6fr_0.6fr] px-3 py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors items-center"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-mono font-bold text-white truncate">{etf.symbol}</div>
              <div className="text-[7px] font-mono text-neutral/30 truncate">{etf.benchmark}</div>
            </div>
            <span className="text-[9px] font-mono font-bold text-white text-right">
              {fmt(etf.nav)}
            </span>
            <span className="text-[9px] font-mono font-bold text-white text-right">
              {fmt(etf.price)}
            </span>
            <div className="text-right">
              <span className={`text-[9px] font-mono font-bold ${premColor}`}>
                {etf.premiumDiscount >= 0 ? '+' : ''}{fmt(etf.premiumDiscount)}%
              </span>
              <div className={`text-[6px] font-mono ${premColor} opacity-60`}>{premLabel}</div>
            </div>
            <span className="text-[9px] font-mono font-bold text-amber-400/80 text-right">
              {fmt(etf.trackingError)}%
            </span>
            <span className="text-[9px] font-mono font-bold text-neutral/60 text-right">
              {fmt(etf.rSquared, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Sector Attribution ──────────────────────────────────────

function SectorSection({ data }: { data: ReturnType<typeof useBenchmarkTracker>['data'] }) {
  const t = useT();
  const sectors = data?.sectorAttribution ?? [];

  const maxWeight = useMemo(() => {
    if (!sectors.length) return 1;
    return Math.max(...sectors.map((s: any) => s.weight));
  }, [sectors]);

  if (!sectors.length) {
    return (
      <div className="flex items-center justify-center py-8 text-[9px] font-mono text-neutral/30 uppercase tracking-widest">
        {t('noData')}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto no-scrollbar">
      {/* Column headers */}
      <div className="grid grid-cols-[1.2fr_1fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 bg-black/40 sticky top-0 z-10">
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">SECTOR</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider">WEIGHT</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">RETURN</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">CONTRIB</span>
        <span className="text-[7px] font-black font-mono text-neutral/40 uppercase tracking-wider text-right">ALLOC</span>
      </div>

      {sectors.map((sec: any) => (
        <div
          key={sec.name}
          className="grid grid-cols-[1.2fr_1fr_0.5fr_0.5fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-emerald-400/[0.02] transition-colors items-center"
        >
          <div className="min-w-0">
            <div className="text-[9px] font-mono font-bold text-white truncate">{sec.name}</div>
          </div>
          {/* Weight bar */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 h-1.5 bg-white/[0.04] relative">
              <div
                className="h-full bg-emerald-400/40 transition-all"
                style={{ width: `${(sec.weight / maxWeight) * 100}%` }}
              />
            </div>
            <span className="text-[8px] font-mono text-neutral/50 w-8 text-right shrink-0">
              {fmt(sec.weight, 1)}%
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(sec.return)}`}>
            {fmtPct(sec.return)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(sec.contribution)}`}>
            {sec.contribution >= 0 ? '+' : ''}{fmt(sec.contribution, 2)}
          </span>
          <span className={`text-[9px] font-mono font-bold text-right ${pctColor(sec.allocationEffect)}`}>
            {sec.allocationEffect >= 0 ? '+' : ''}{fmt(sec.allocationEffect, 2)}
          </span>
        </div>
      ))}

      {/* Total row */}
      {sectors.length > 0 && (
        <div className="grid grid-cols-[1.2fr_1fr_0.5fr_0.5fr_0.5fr] px-3 py-1.5 border-t border-emerald-400/20 bg-emerald-400/[0.03] items-center">
          <span className="text-[9px] font-mono font-black text-emerald-400 uppercase">TOTAL</span>
          <span className="text-[8px] font-mono text-neutral/50 text-right pr-1">
            {fmt(sectors.reduce((a: number, s: any) => a + s.weight, 0), 1)}%
          </span>
          <span className={`text-[9px] font-mono font-black text-right ${pctColor(
            sectors.reduce((a: number, s: any) => a + s.contribution, 0)
          )}`}>
            {fmtPct(sectors.reduce((a: number, s: any) => a + s.weight * s.return / 100, 0) * 100 / sectors.reduce((a: number, s: any) => a + s.weight, 0))}
          </span>
          <span className={`text-[9px] font-mono font-black text-right ${pctColor(
            sectors.reduce((a: number, s: any) => a + s.contribution, 0)
          )}`}>
            {sectors.reduce((a: number, s: any) => a + s.contribution, 0) >= 0 ? '+' : ''}
            {fmt(sectors.reduce((a: number, s: any) => a + s.contribution, 0), 2)}
          </span>
          <span className="text-[8px] font-mono text-neutral/30 text-right">-</span>
        </div>
      )}
    </div>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────

const TAB_LABELS: { key: Tab; label: string }[] = [
  { key: 'indices', label: 'INDICES' },
  { key: 'relative', label: 'RELATIVE' },
  { key: 'tracking', label: 'TRACKING' },
  { key: 'sector', label: 'SECTOR' },
];

export function BenchmarkTrackerPanel() {
  const t = useT();
  const { data, isLoading, error, refetch } = useBenchmarkTracker();
  const [activeTab, setActiveTab] = useState<Tab>('indices');

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-emerald-400">
            {t('panelBenchmarkTracker')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data?.updatedAt && (
            <span className="text-[7px] font-mono text-neutral/30">
              {new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral/40 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-black/60 shrink-0">
        {TAB_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-2 py-0.5 text-[7px] font-black font-mono uppercase tracking-wider border transition-colors ${
              activeTab === key
                ? 'border-emerald-400/40 text-emerald-400 bg-emerald-400/10'
                : 'border-border/20 text-neutral/30 hover:text-neutral/60'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && !data ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              {t('loading')}
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <span className="text-[10px] font-mono text-bearish/60 uppercase tracking-widest">
            FAILED TO LOAD
          </span>
          <button
            onClick={() => refetch()}
            className="text-[9px] font-mono text-emerald-400 hover:text-white border border-emerald-400/30 px-2 py-0.5 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      ) : (
        <>
          {activeTab === 'indices' && <IndicesSection data={data} />}
          {activeTab === 'relative' && <RelativeSection data={data} />}
          {activeTab === 'tracking' && <TrackingSection data={data} />}
          {activeTab === 'sector' && <SectorSection data={data} />}
        </>
      )}

      {/* Footer */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral/30 uppercase tracking-wider">
          BENCHMARK TRACKER
        </span>
        <span className="text-[7px] font-mono text-neutral/20">
          {activeTab === 'indices' && `${data?.indices?.length ?? 0} indices`}
          {activeTab === 'relative' && `${data?.relativeSpreads?.length ?? 0} spreads`}
          {activeTab === 'tracking' && `${data?.trackingAnalysis?.length ?? 0} ETFs`}
          {activeTab === 'sector' && `${data?.sectorAttribution?.length ?? 0} sectors`}
        </span>
      </div>
    </div>
  );
}
