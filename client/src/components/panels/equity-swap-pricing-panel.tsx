import { useState, useMemo } from 'react';
import { useEquitySwapPricing } from '../../api/hooks/use-equity-swap-pricing';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try { return (t as (k: string) => string)(key) || fallback; } catch { return fallback; }
};

// ── Constants ──

const LIME = '#a3e635'; // lime-400
const LIME_DIM = 'rgba(163,230,53,0.02)';

type ViewTab = 'SWAPS' | 'PRICING GRID' | 'RATES' | 'RECENT TRADES';
const TABS: ViewTab[] = ['SWAPS', 'PRICING GRID', 'RATES', 'RECENT TRADES'];

type SwapSortKey = 'underlying' | 'notional' | 'spread' | 'fixedRate' | 'floatRate' | 'npv' | 'dv01';

// ── Formatting helpers ──

function fmt(n: unknown, decimals = 2): string {
  const v = Number(n);
  if (n == null || isNaN(v)) return '-';
  return v.toFixed(decimals);
}

function fmtBps(n: unknown): string {
  const v = Number(n);
  if (n == null || isNaN(v)) return '-';
  const sign = v >= 0 ? '+' : '';
  return sign + v.toFixed(1) + 'bp';
}

function fmtPct(n: unknown, decimals = 2): string {
  const v = Number(n);
  if (n == null || isNaN(v)) return '-';
  return v.toFixed(decimals) + '%';
}

function fmtNotional(n: unknown): string {
  const v = Number(n);
  if (n == null || isNaN(v)) return '-';
  if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (Math.abs(v) >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toFixed(0);
}

function fmtDate(d: unknown): string {
  if (!d) return '-';
  try {
    const date = new Date(String(d));
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  } catch {
    return String(d);
  }
}

function fmtTime(d: unknown): string {
  if (!d) return '-';
  try {
    const date = new Date(String(d));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return String(d);
  }
}

// ── Color helpers ──

function spreadColor(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return 'text-neutral-500';
  if (n > 100) return 'text-red-400';
  if (n > 50) return 'text-orange-400';
  if (n > 20) return 'text-yellow-400';
  return 'text-lime-400';
}

function npvColor(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function changeColor(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return 'text-neutral-500';
  if (n > 0) return 'text-emerald-400';
  if (n < 0) return 'text-red-400';
  return 'text-neutral-500';
}

function rateColor(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return 'text-neutral-500';
  if (n >= 5) return 'text-red-400';
  if (n >= 4) return 'text-orange-400';
  if (n >= 3) return 'text-yellow-400';
  return 'text-lime-400';
}

function directionBadge(dir: unknown): { label: string; color: string; bg: string } {
  const s = String(dir).toLowerCase();
  if (s === 'pay' || s === 'payer') return { label: 'PAY', color: '#f87171', bg: 'rgba(248,113,113,0.12)' };
  if (s === 'receive' || s === 'receiver') return { label: 'RCV', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
  return { label: String(dir).toUpperCase(), color: '#a3e635', bg: 'rgba(163,230,53,0.12)' };
}

function typeBadge(type: unknown): { label: string; color: string; bg: string } {
  const s = String(type).toLowerCase();
  if (s.includes('total return') || s === 'trs') return { label: 'TRS', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' };
  if (s.includes('equity') || s === 'eqs') return { label: 'EQS', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' };
  if (s.includes('variance') || s === 'var') return { label: 'VAR', color: '#f472b6', bg: 'rgba(244,114,182,0.12)' };
  if (s.includes('dividend') || s === 'div') return { label: 'DIV', color: '#22d3ee', bg: 'rgba(34,211,238,0.12)' };
  return { label: String(type).toUpperCase().slice(0, 3), color: '#a3e635', bg: 'rgba(163,230,53,0.12)' };
}

// ── Sorting ──

function sortSwaps(swaps: any[], key: SwapSortKey, asc: boolean): any[] {
  return [...swaps].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'underlying': cmp = String(a.underlying ?? '').localeCompare(String(b.underlying ?? '')); break;
      case 'notional': cmp = Number(a.notional ?? 0) - Number(b.notional ?? 0); break;
      case 'spread': cmp = Number(a.spread ?? 0) - Number(b.spread ?? 0); break;
      case 'fixedRate': cmp = Number(a.fixedRate ?? 0) - Number(b.fixedRate ?? 0); break;
      case 'floatRate': cmp = Number(a.floatRate ?? 0) - Number(b.floatRate ?? 0); break;
      case 'npv': cmp = Number(a.npv ?? 0) - Number(b.npv ?? 0); break;
      case 'dv01': cmp = Number(a.dv01 ?? 0) - Number(b.dv01 ?? 0); break;
      default: cmp = 0;
    }
    return asc ? cmp : -cmp;
  });
}

// ── Sortable header ──

function Th({
  label,
  sortKey,
  currentSort,
  currentAsc,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SwapSortKey;
  currentSort: SwapSortKey;
  currentAsc: boolean;
  onSort: (key: SwapSortKey) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === sortKey;
  return (
    <th
      className={`px-1.5 py-1 text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 cursor-pointer hover:text-lime-400 select-none whitespace-nowrap ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
      onClick={() => onSort(sortKey)}
    >
      {label}
      {isActive ? (
        <span className="ml-0.5 text-lime-400">{currentAsc ? '\u25B2' : '\u25BC'}</span>
      ) : null}
    </th>
  );
}

// ── Main Panel ──

export function EquitySwapPricingPanel() {
  const t = useT();
  const { data, isLoading, refetch } = useEquitySwapPricing();

  const [tab, setTab] = useState<ViewTab>('SWAPS');
  const [sortKey, setSortKey] = useState<SwapSortKey>('notional');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = (key: SwapSortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'underlying');
    }
  };

  const d = data as Record<string, any> | undefined;
  const swaps: any[] = d?.swaps ?? [];
  const pricingGrid: any[] = d?.pricingGrid ?? [];
  const marketRates: any[] = d?.marketRates ?? [];
  const recentTrades: any[] = d?.recentTrades ?? [];
  const indexDividendSchedule: any[] = d?.indexDividendSchedule ?? [];

  const sortedSwaps = useMemo(() => sortSwaps(swaps, sortKey, sortAsc), [swaps, sortKey, sortAsc]);

  // Summary stats
  const totalNotional = useMemo(() => swaps.reduce((s: number, sw: any) => s + Number(sw.notional ?? 0), 0), [swaps]);
  const avgSpread = useMemo(() => {
    if (swaps.length === 0) return 0;
    return swaps.reduce((s: number, sw: any) => s + Number(sw.spread ?? 0), 0) / swaps.length;
  }, [swaps]);
  const totalNpv = useMemo(() => swaps.reduce((s: number, sw: any) => s + Number(sw.npv ?? 0), 0), [swaps]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-lime-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-lime-400">
            {tr(t, 'equitySwapPricingTitle', 'Equity Swap Pricing')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-lime-400 bg-lime-400/10 border border-lime-400/30">
            NOTL {fmtNotional(totalNotional)}
          </span>
          <span className="text-[7px] font-black font-mono uppercase px-1.5 py-0.5 text-neutral-400 bg-neutral-400/10 border border-neutral-400/30">
            AVG SPRD {fmtBps(avgSpread)}
          </span>
          <span className={`text-[7px] font-black font-mono uppercase px-1.5 py-0.5 border ${
            totalNpv >= 0
              ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
              : 'text-red-400 bg-red-400/10 border-red-400/30'
          }`}>
            NPV {fmtNotional(totalNpv)}
          </span>
          <button onClick={() => refetch()} className="p-1 text-neutral-500 hover:text-lime-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-border/20 shrink-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-colors"
            style={{
              color: tab === t ? LIME : 'rgba(255,255,255,0.25)',
              borderBottom: tab === t ? `1px solid ${LIME}` : '1px solid transparent',
              background: tab === t ? LIME_DIM : 'transparent',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data ? (
          <div className="text-center py-8 text-lime-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        ) : !data && !isLoading ? (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'equitySwapNoData', 'No data available')}
          </div>
        ) : (
          <>
            {tab === 'SWAPS' ? (
              <SwapsView
                swaps={sortedSwaps}
                sortKey={sortKey}
                sortAsc={sortAsc}
                onSort={handleSort}
              />
            ) : tab === 'PRICING GRID' ? (
              <PricingGridView grid={pricingGrid} dividends={indexDividendSchedule} />
            ) : tab === 'RATES' ? (
              <RatesView rates={marketRates} />
            ) : tab === 'RECENT TRADES' ? (
              <RecentTradesView trades={recentTrades} />
            ) : null}

            {/* Timestamp footer */}
            {d?.generatedAt ? (
              <div className="px-3 py-1 border-t border-border/10">
                <span className="text-[7px] font-mono text-neutral-700">
                  {tr(t, 'equitySwapLastUpdate', 'Last update')}: {fmtTime(d.generatedAt)}
                </span>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

// ── SWAPS View ──

function SwapsView({
  swaps,
  sortKey,
  sortAsc,
  onSort,
}: {
  swaps: any[];
  sortKey: SwapSortKey;
  sortAsc: boolean;
  onSort: (key: SwapSortKey) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[9px] font-mono">
        <thead className="sticky top-0 bg-[#080808] z-10">
          <tr className="border-b border-border/20">
            <Th label="Underlying" sortKey="underlying" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Type
            </th>
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Dir
            </th>
            <Th label="Notional" sortKey="notional" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="Spread" sortKey="spread" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="Fixed" sortKey="fixedRate" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="Float" sortKey="floatRate" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
              Maturity
            </th>
            <Th label="NPV" sortKey="npv" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
            <Th label="DV01" sortKey="dv01" currentSort={sortKey} currentAsc={sortAsc} onSort={onSort} align="right" />
          </tr>
        </thead>
        <tbody>
          {swaps.length > 0 ? (
            swaps.map((sw: any, idx: number) => {
              const dir = directionBadge(sw.direction);
              const tp = typeBadge(sw.type);
              return (
                <tr
                  key={String(sw.id ?? idx)}
                  className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span className="text-white font-bold">{String(sw.underlying ?? '-')}</span>
                    {sw.tenor ? (
                      <span className="text-[7px] text-neutral-600 ml-1">{String(sw.tenor)}</span>
                    ) : null}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: tp.color, background: tp.bg }}
                    >
                      {tp.label}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap">
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: dir.color, background: dir.bg }}
                    >
                      {dir.label}
                    </span>
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right font-bold text-lime-400 tabular-nums">
                    {fmtNotional(sw.notional)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${spreadColor(sw.spread)}`}>
                    {fmtBps(sw.spread)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70 tabular-nums">
                    {fmtPct(sw.fixedRate)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70 tabular-nums">
                    {fmtPct(sw.floatRate)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                    {fmtDate(sw.maturity)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${npvColor(sw.npv)}`}>
                    {fmtNotional(sw.npv)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60 tabular-nums">
                    {fmt(sw.dv01, 0)}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={10} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                No swaps data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── PRICING GRID View ──

function PricingGridView({ grid, dividends }: { grid: any[]; dividends: any[] }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      {/* Pricing grid table */}
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
          {tr(t, 'equitySwapPricingGrid', 'Swap Pricing by Tenor & Index')}
        </span>
      </div>

      <div className="overflow-x-auto mb-3">
        <table className="w-full text-[9px] font-mono">
          <thead className="sticky top-0 bg-[#080808] z-10">
            <tr className="border-b border-border/20">
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Index
              </th>
              <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Tenor
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Bid
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Ask
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Mid
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Chg
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Div Yld
              </th>
              <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                Repo
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.length > 0 ? (
              grid.map((row: any, idx: number) => (
                <tr
                  key={String(row.index ?? '') + String(row.tenor ?? '') + idx}
                  className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
                >
                  <td className="px-1.5 py-1 whitespace-nowrap font-bold text-white">
                    {String(row.index ?? '-')}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                    {String(row.tenor ?? '-')}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-lime-400 font-bold tabular-nums">
                    {fmtBps(row.bid)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-red-400 font-bold tabular-nums">
                    {fmtBps(row.ask)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/80 font-bold tabular-nums">
                    {fmtBps(row.mid)}
                  </td>
                  <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.change)}`}>
                    {fmtBps(row.change)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60 tabular-nums">
                    {fmtPct(row.divYield)}
                  </td>
                  <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/60 tabular-nums">
                    {fmtPct(row.repoRate)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
                  No pricing grid data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Index dividend schedule */}
      {dividends.length > 0 ? (
        <>
          <div className="flex items-center gap-1.5 mb-1.5 px-1">
            <div className="w-1 h-1 bg-lime-400" />
            <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
              {tr(t, 'equitySwapDividendSchedule', 'Index Dividend Schedule')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/20">
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Index
                  </th>
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Ex-Date
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Points
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Yield
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    YoY Chg
                  </th>
                </tr>
              </thead>
              <tbody>
                {dividends.map((row: any, idx: number) => (
                  <tr
                    key={String(row.index ?? '') + String(row.exDate ?? '') + idx}
                    className="border-b border-border/10 hover:bg-lime-400/[0.02] transition-colors"
                  >
                    <td className="px-1.5 py-1 whitespace-nowrap font-bold text-white">
                      {String(row.index ?? '-')}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                      {fmtDate(row.exDate)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right text-lime-400 font-bold tabular-nums">
                      {fmt(row.points, 2)}
                    </td>
                    <td className="px-1.5 py-1 whitespace-nowrap text-right text-white/70 tabular-nums">
                      {fmtPct(row.yield)}
                    </td>
                    <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(row.yoyChange)}`}>
                      {row.yoyChange != null ? (Number(row.yoyChange) >= 0 ? '+' : '') + fmt(row.yoyChange, 1) + '%' : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

// ── RATES View ──

function RatesView({ rates }: { rates: any[] }) {
  const t = useT();

  // Group rates by category if available
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const r of rates) {
      const cat = String(r.category ?? 'OTHER');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(r);
    }
    return groups;
  }, [rates]);

  const categories = Object.keys(grouped);

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
          {tr(t, 'equitySwapMarketRates', 'Market Reference Rates')}
        </span>
      </div>

      {categories.length > 0 ? (
        categories.map((cat) => (
          <div key={cat} className="mb-3">
            <div className="text-[7px] font-bold uppercase tracking-wider text-neutral-600 px-1.5 py-1 border-b border-border/10">
              {cat}
            </div>
            <table className="w-full text-[9px] font-mono">
              <thead>
                <tr className="border-b border-border/15">
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Rate
                  </th>
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Tenor
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Value
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Chg 1D
                  </th>
                  <th className="px-1.5 py-1 text-right text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap">
                    Chg 1W
                  </th>
                  <th className="px-1.5 py-1 text-left text-[7px] font-mono font-bold uppercase tracking-wider text-neutral-500 whitespace-nowrap pl-3">
                    52W Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((r: any, idx: number) => {
                  const low = Number(r.low52w ?? 0);
                  const high = Number(r.high52w ?? 0);
                  const val = Number(r.value ?? 0);
                  const rangeWidth = high - low;
                  const pos = rangeWidth > 0 ? ((val - low) / rangeWidth) * 100 : 50;

                  return (
                    <tr
                      key={String(r.name ?? '') + String(r.tenor ?? '') + idx}
                      className="border-b border-border/5 hover:bg-lime-400/[0.02] transition-colors"
                    >
                      <td className="px-1.5 py-1 whitespace-nowrap font-bold text-white">
                        {String(r.name ?? '-')}
                      </td>
                      <td className="px-1.5 py-1 whitespace-nowrap text-neutral-400">
                        {String(r.tenor ?? '-')}
                      </td>
                      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${rateColor(r.value)}`}>
                        {fmtPct(r.value, 3)}
                      </td>
                      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(r.change1d)}`}>
                        {fmtBps(r.change1d)}
                      </td>
                      <td className={`px-1.5 py-1 whitespace-nowrap text-right font-bold tabular-nums ${changeColor(r.change1w)}`}>
                        {fmtBps(r.change1w)}
                      </td>
                      <td className="px-1.5 py-1 pl-3">
                        {rangeWidth > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[7px] text-neutral-600 tabular-nums w-8 text-right">{fmt(low, 2)}</span>
                            <div className="flex-1 h-1.5 bg-neutral-900 relative min-w-[60px]">
                              <div className="absolute top-0 left-0 h-full w-full bg-neutral-800" />
                              <div
                                className="absolute top-[-1px] w-[3px] h-[8px] bg-lime-400"
                                style={{
                                  left: `${Math.max(0, Math.min(100, pos))}%`,
                                  transform: 'translateX(-50%)',
                                }}
                              />
                            </div>
                            <span className="text-[7px] text-neutral-600 tabular-nums w-8">{fmt(high, 2)}</span>
                          </div>
                        ) : (
                          <span className="text-[7px] text-neutral-700">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          No rates data
        </div>
      )}
    </div>
  );
}

// ── RECENT TRADES View ──

function RecentTradesView({ trades }: { trades: any[] }) {
  const t = useT();

  return (
    <div className="px-2 py-2">
      <div className="flex items-center gap-1.5 mb-1.5 px-1">
        <div className="w-1 h-1 bg-lime-400" />
        <span className="text-[7px] font-black uppercase tracking-widest text-neutral-400">
          {tr(t, 'equitySwapRecentTrades', 'Recent Swap Trades')}
        </span>
      </div>

      {trades.length > 0 ? (
        <div className="space-y-1">
          {trades.map((trade: any, idx: number) => {
            const dir = directionBadge(trade.direction);
            const tp = typeBadge(trade.type);

            return (
              <div
                key={String(trade.id ?? idx)}
                className="p-2 border border-border/20 bg-[#060606] hover:bg-lime-400/[0.02] transition-colors"
              >
                {/* Top row: badges + underlying + timestamp */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: tp.color, background: tp.bg }}
                    >
                      {tp.label}
                    </span>
                    <span
                      className="text-[7px] font-bold px-1 py-0.5"
                      style={{ color: dir.color, background: dir.bg }}
                    >
                      {dir.label}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-white">
                      {String(trade.underlying ?? '-')}
                    </span>
                    {trade.counterparty ? (
                      <span className="text-[7px] font-mono text-neutral-600">
                        vs {String(trade.counterparty)}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {trade.venue ? (
                      <span className="text-[7px] font-mono text-neutral-600 px-1 py-0.5 bg-neutral-800">
                        {String(trade.venue)}
                      </span>
                    ) : null}
                    <span className="text-[7px] font-mono text-neutral-600">
                      {fmtTime(trade.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Detail row */}
                <div className="flex items-center gap-4 text-[8px] font-mono">
                  <div>
                    <span className="text-neutral-600 mr-1">NOTL</span>
                    <span className="text-lime-400 font-bold">{fmtNotional(trade.notional)}</span>
                  </div>
                  <div>
                    <span className="text-neutral-600 mr-1">SPRD</span>
                    <span className={`font-bold ${spreadColor(trade.spread)}`}>{fmtBps(trade.spread)}</span>
                  </div>
                  {trade.fixedRate != null ? (
                    <div>
                      <span className="text-neutral-600 mr-1">FIXED</span>
                      <span className="text-white/70">{fmtPct(trade.fixedRate)}</span>
                    </div>
                  ) : null}
                  {trade.floatRate != null ? (
                    <div>
                      <span className="text-neutral-600 mr-1">FLOAT</span>
                      <span className="text-white/70">{fmtPct(trade.floatRate)}</span>
                    </div>
                  ) : null}
                  {trade.tenor ? (
                    <div>
                      <span className="text-neutral-600 mr-1">TENOR</span>
                      <span className="text-white/60">{String(trade.tenor)}</span>
                    </div>
                  ) : null}
                  {trade.maturity ? (
                    <div>
                      <span className="text-neutral-600 mr-1">MAT</span>
                      <span className="text-neutral-400">{fmtDate(trade.maturity)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-neutral-600 text-[8px] font-mono uppercase">
          {tr(t, 'equitySwapNoTrades', 'No recent trades')}
        </div>
      )}
    </div>
  );
}
