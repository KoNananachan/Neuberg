import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useAnalystRatings, type AnalystRating } from '../../api/hooks/use-analyst';
import { useAppStore } from '../../stores/use-app-store';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

type FilterTab = 'all' | 'strong_buy' | 'buy' | 'hold' | 'sell';
type SortKey = 'symbol' | 'price' | 'rating' | 'target' | 'upside' | 'analysts';
type SortDir = 'asc' | 'desc';

function ratingColor(key: string | null): string {
  switch (key) {
    case 'strong_buy': return 'text-emerald-400';
    case 'buy': return 'text-green-400';
    case 'hold': return 'text-yellow-400';
    case 'underperform': return 'text-orange-400';
    case 'sell': return 'text-red-400';
    default: return 'text-neutral/50';
  }
}

function ratingBgColor(key: string | null): string {
  switch (key) {
    case 'strong_buy': return 'bg-emerald-500/20 border-emerald-500/40';
    case 'buy': return 'bg-green-500/20 border-green-500/40';
    case 'hold': return 'bg-yellow-500/20 border-yellow-500/40';
    case 'underperform': return 'bg-orange-500/20 border-orange-500/40';
    case 'sell': return 'bg-red-500/20 border-red-500/40';
    default: return 'bg-neutral/10 border-neutral/20';
  }
}

function ratingLabel(key: string | null, t: (k: any) => string): string {
  switch (key) {
    case 'strong_buy': return t('analystStrongBuy');
    case 'buy': return t('analystBuy');
    case 'hold': return t('analystHold');
    case 'underperform':
    case 'sell': return t('analystSell');
    default: return '-';
  }
}

function matchesFilter(r: AnalystRating, filter: FilterTab): boolean {
  if (filter === 'all') return true;
  if (filter === 'sell') return r.recommendationKey === 'sell' || r.recommendationKey === 'underperform';
  return r.recommendationKey === filter;
}

function sortRatings(data: AnalystRating[], key: SortKey, dir: SortDir): AnalystRating[] {
  const sorted = [...data];
  sorted.sort((a, b) => {
    let av: number | string | null;
    let bv: number | string | null;
    switch (key) {
      case 'symbol': av = a.symbol; bv = b.symbol; break;
      case 'price': av = a.price; bv = b.price; break;
      case 'rating': av = a.recommendationMean; bv = b.recommendationMean; break;
      case 'target': av = a.targetMean; bv = b.targetMean; break;
      case 'upside': av = a.upside; bv = b.upside; break;
      case 'analysts': av = a.numberOfAnalysts; bv = b.numberOfAnalysts; break;
      default: return 0;
    }
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

function TargetRangeBar({ low, current, high }: { low: number; current: number; high: number }) {
  if (low >= high) return null;
  const range = high - low;
  const pos = Math.max(0, Math.min(1, (current - low) / range));

  return (
    <svg width="100%" height="12" viewBox="0 0 100 12" preserveAspectRatio="none" className="block">
      {/* Range bar */}
      <rect x="2" y="4" width="96" height="4" rx="2" fill="rgba(255,255,255,0.06)" />
      {/* Low marker */}
      <rect x="2" y="2" width="1" height="8" fill="rgba(239,68,68,0.5)" />
      {/* High marker */}
      <rect x="97" y="2" width="1" height="8" fill="rgba(34,197,94,0.5)" />
      {/* Current price marker */}
      <circle cx={2 + pos * 96} cy="6" r="3" fill="#3b82f6" stroke="rgba(59,130,246,0.4)" strokeWidth="1" />
    </svg>
  );
}

function DistributionBar({ strongBuy, buy, hold, sell, strongSell }: {
  strongBuy: number; buy: number; hold: number; sell: number; strongSell: number;
}) {
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total === 0) return <span className="text-neutral/30 text-[9px]">-</span>;

  const segments = [
    { count: strongBuy, color: '#10b981' },  // emerald
    { count: buy, color: '#22c55e' },          // green
    { count: hold, color: '#eab308' },         // yellow
    { count: sell, color: '#f97316' },          // orange
    { count: strongSell, color: '#ef4444' },   // red
  ];

  let x = 0;
  return (
    <svg width="100%" height="10" viewBox="0 0 100 10" preserveAspectRatio="none" className="block">
      <rect x="0" y="0" width="100" height="10" rx="2" fill="rgba(255,255,255,0.03)" />
      {segments.map((seg, i) => {
        const w = (seg.count / total) * 100;
        const rx = x;
        x += w;
        if (w === 0) return null;
        return (
          <rect
            key={i}
            x={rx}
            y="0"
            width={w}
            height="10"
            fill={seg.color}
            opacity={0.7}
            rx={i === 0 ? 2 : 0}
          />
        );
      })}
    </svg>
  );
}

export function AnalystPanel() {
  const t = useT();
  const { data, isLoading, refetch, dataUpdatedAt } = useAnalystRatings();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('upside');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((key: SortKey) => {
    setSortKey(prev => {
      if (prev === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        return key;
      }
      setSortDir(key === 'symbol' ? 'asc' : 'desc');
      return key;
    });
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const matched = data.filter(r => matchesFilter(r, filter));
    return sortRatings(matched, sortKey, sortDir);
  }, [data, filter, sortKey, sortDir]);

  const stats = useMemo(() => {
    if (!data || data.length === 0) return { total: 0, avgUpside: 0, avgRating: 0 };
    const withUpside = data.filter(r => r.upside != null);
    const withRating = data.filter(r => r.recommendationMean != null);
    return {
      total: data.length,
      avgUpside: withUpside.length > 0
        ? withUpside.reduce((s, r) => s + (r.upside ?? 0), 0) / withUpside.length
        : 0,
      avgRating: withRating.length > 0
        ? withRating.reduce((s, r) => s + (r.recommendationMean ?? 0), 0) / withRating.length
        : 0,
    };
  }, [data]);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'strong_buy', label: t('analystStrongBuy') },
    { key: 'buy', label: t('analystBuy') },
    { key: 'hold', label: t('analystHold') },
    { key: 'sell', label: t('analystSell') },
  ];

  return (
    <GlassCard className="flex flex-col h-full text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04]">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-accent" />
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral/80 uppercase">
            {t('panelAnalyst')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {dataUpdatedAt > 0 && (
            <span className="text-[9px] font-mono text-neutral/30">
              {new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-0.5 text-neutral/40 hover:text-accent transition-colors"
            title="Refresh"
          >
            <RefreshCw size={10} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-3 py-1 border-b border-white/[0.04] overflow-x-auto">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded transition-colors whitespace-nowrap ${
              filter === f.key
                ? 'bg-accent/20 text-accent border border-accent/30'
                : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral/30 text-[10px] font-mono uppercase tracking-widest">
            {t('analystNoData')}
          </div>
        ) : (
          <table className="w-full text-[10px] font-mono">
            <thead className="sticky top-0 z-10 bg-black/90 backdrop-blur-sm">
              <tr className="border-b border-white/[0.06]">
                <th
                  className="text-left px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('symbol')}
                >
                  Symbol{sortArrow('symbol')}
                </th>
                <th
                  className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('price')}
                >
                  Price{sortArrow('price')}
                </th>
                <th
                  className="text-center px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('rating')}
                >
                  {t('analystRating')}{sortArrow('rating')}
                </th>
                <th
                  className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('target')}
                >
                  {t('analystTarget')}{sortArrow('target')}
                </th>
                <th
                  className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('upside')}
                >
                  {t('analystUpside')}{sortArrow('upside')}
                </th>
                <th className="text-center px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider w-[80px]">
                  Range
                </th>
                <th
                  className="text-right px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider cursor-pointer hover:text-neutral/70 select-none"
                  onClick={() => handleSort('analysts')}
                >
                  {t('analystAnalysts')}{sortArrow('analysts')}
                </th>
                <th className="text-center px-2 py-1 text-neutral/40 font-medium uppercase tracking-wider w-[90px]">
                  Distribution
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr
                  key={r.symbol}
                  onClick={() => setSelectedSymbol(r.symbol)}
                  className="border-b border-white/[0.02] hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  {/* Symbol + Name */}
                  <td className="px-2 py-1.5">
                    <div className="flex flex-col">
                      <span className="text-white font-bold text-[10px]">{r.symbol}</span>
                      <span className="text-neutral/30 text-[8px] truncate max-w-[80px]">{r.name}</span>
                    </div>
                  </td>

                  {/* Price + Change */}
                  <td className="text-right px-2 py-1.5">
                    <div className="flex flex-col items-end">
                      <span className="text-neutral/80">${r.price.toFixed(2)}</span>
                      <span className={`text-[9px] ${r.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {r.changePercent >= 0 ? '+' : ''}{r.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </td>

                  {/* Rating badge */}
                  <td className="text-center px-2 py-1.5">
                    {r.recommendationKey ? (
                      <span className={`inline-block px-1.5 py-0.5 text-[8px] uppercase font-bold tracking-wider rounded border ${ratingBgColor(r.recommendationKey)} ${ratingColor(r.recommendationKey)}`}>
                        {ratingLabel(r.recommendationKey, t)}
                      </span>
                    ) : (
                      <span className="text-neutral/20">-</span>
                    )}
                  </td>

                  {/* Target Mean */}
                  <td className="text-right px-2 py-1.5">
                    {r.targetMean != null ? (
                      <span className="text-neutral/70">${r.targetMean.toFixed(2)}</span>
                    ) : (
                      <span className="text-neutral/20">-</span>
                    )}
                  </td>

                  {/* Upside */}
                  <td className="text-right px-2 py-1.5">
                    {r.upside != null ? (
                      <span className={`text-[11px] font-bold ${r.upside >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {r.upside >= 0 ? '+' : ''}{r.upside.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-neutral/20">-</span>
                    )}
                  </td>

                  {/* Target range bar */}
                  <td className="px-2 py-1.5">
                    {r.targetLow != null && r.targetHigh != null && r.price > 0 ? (
                      <div className="w-[70px]">
                        <TargetRangeBar low={r.targetLow} current={r.price} high={r.targetHigh} />
                        <div className="flex justify-between text-[7px] text-neutral/25 mt-0.5">
                          <span>${r.targetLow.toFixed(0)}</span>
                          <span>${r.targetHigh.toFixed(0)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-neutral/20 text-center block">-</span>
                    )}
                  </td>

                  {/* # Analysts */}
                  <td className="text-right px-2 py-1.5 text-neutral/50">
                    {r.numberOfAnalysts ?? '-'}
                  </td>

                  {/* Distribution bar */}
                  <td className="px-2 py-1.5">
                    <div className="w-[80px]">
                      <DistributionBar
                        strongBuy={r.strongBuy}
                        buy={r.buy}
                        hold={r.hold}
                        sell={r.sell}
                        strongSell={r.strongSell}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 border-t border-white/[0.04] text-[9px] font-mono text-neutral/30">
        <span>{filtered.length} / {stats.total} stocks</span>
        <div className="flex items-center gap-3">
          <span>
            {t('analystAvgUpside')}: <span className={stats.avgUpside >= 0 ? 'text-bullish/70' : 'text-bearish/70'}>
              {stats.avgUpside >= 0 ? '+' : ''}{stats.avgUpside.toFixed(1)}%
            </span>
          </span>
          <span>
            Avg {t('analystRating')}: <span className="text-neutral/50">{stats.avgRating.toFixed(2)}</span>
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
