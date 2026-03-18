import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useShortInterest, type ShortInterestData } from '../../api/hooks/use-short-interest';
import { useAppStore } from '../../stores/use-app-store';
import { TrendingDown, RefreshCw, ArrowUp, ArrowDown, AlertTriangle } from 'lucide-react';
import { useT } from '../../i18n';

type FilterTab = 'all' | 'high' | 'squeeze' | 'increasing' | 'decreasing';
type SortKey = 'symbol' | 'price' | 'changePercent' | 'shortPercentOfFloat' | 'shortRatio' | 'sharesShort' | 'shortChangePercent' | 'volumeRatio';
type SortDir = 'asc' | 'desc';

function formatNumber(n: number | null): string {
  if (n == null) return '-';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function formatPercent(n: number | null, decimals = 1): string {
  if (n == null) return '-';
  return (n * 100).toFixed(decimals) + '%';
}

function formatRawPercent(n: number | null, decimals = 1): string {
  if (n == null) return '-';
  return n.toFixed(decimals) + '%';
}

function shortFloatColor(pct: number | null): string {
  if (pct == null) return 'text-neutral/50';
  const p = pct * 100;
  if (p >= 30) return 'text-red-400';
  if (p >= 20) return 'text-orange-400';
  if (p >= 10) return 'text-yellow-400';
  return 'text-neutral/70';
}

function shortRatioColor(ratio: number | null): string {
  if (ratio == null) return 'text-neutral/50';
  if (ratio >= 5) return 'text-red-400';
  if (ratio >= 3) return 'text-orange-400';
  return 'text-neutral/70';
}

function isSqueezeRisk(stock: ShortInterestData): boolean {
  return (
    (stock.shortPercentOfFloat ?? 0) > 0.15 &&
    (stock.shortRatio ?? 0) > 3 &&
    stock.avgVolume != null &&
    stock.avgVolume > 0 &&
    stock.volume > stock.avgVolume
  );
}

function applyFilter(stocks: ShortInterestData[], filter: FilterTab): ShortInterestData[] {
  switch (filter) {
    case 'high':
      return stocks.filter(s => (s.shortPercentOfFloat ?? 0) > 0.20);
    case 'squeeze':
      return stocks.filter(isSqueezeRisk);
    case 'increasing':
      return stocks.filter(s => s.shortChangePercent != null && s.shortChangePercent > 0);
    case 'decreasing':
      return stocks.filter(s => s.shortChangePercent != null && s.shortChangePercent < 0);
    default:
      return stocks;
  }
}

function sortStocks(stocks: ShortInterestData[], key: SortKey, dir: SortDir): ShortInterestData[] {
  return [...stocks].sort((a, b) => {
    let va: number;
    let vb: number;
    switch (key) {
      case 'symbol':
        return dir === 'asc' ? a.symbol.localeCompare(b.symbol) : b.symbol.localeCompare(a.symbol);
      case 'price':
        va = a.price; vb = b.price; break;
      case 'changePercent':
        va = a.changePercent ?? 0; vb = b.changePercent ?? 0; break;
      case 'shortPercentOfFloat':
        va = a.shortPercentOfFloat ?? -1; vb = b.shortPercentOfFloat ?? -1; break;
      case 'shortRatio':
        va = a.shortRatio ?? -1; vb = b.shortRatio ?? -1; break;
      case 'sharesShort':
        va = a.sharesShort ?? -1; vb = b.sharesShort ?? -1; break;
      case 'shortChangePercent':
        va = a.shortChangePercent ?? 0; vb = b.shortChangePercent ?? 0; break;
      case 'volumeRatio':
        va = a.avgVolume ? a.volume / a.avgVolume : 0;
        vb = b.avgVolume ? b.volume / b.avgVolume : 0;
        break;
      default:
        va = 0; vb = 0;
    }
    return dir === 'asc' ? va - vb : vb - va;
  });
}

export function ShortInterestPanel() {
  const t = useT();
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('shortPercentOfFloat');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { data, isLoading, error, refetch } = useShortInterest();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return applyFilter(data, filter);
  }, [data, filter]);

  const sorted = useMemo(() => sortStocks(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  // Summary stats
  const summary = useMemo(() => {
    if (!data || data.length === 0) return null;
    const withData = data.filter(s => s.shortPercentOfFloat != null);
    const highShortCount = withData.filter(s => (s.shortPercentOfFloat ?? 0) > 0.20).length;
    const avgShortRatio = withData.length > 0
      ? withData.reduce((sum, s) => sum + (s.shortRatio ?? 0), 0) / withData.filter(s => s.shortRatio != null).length
      : 0;
    const highestShort = withData.reduce((best, s) =>
      (s.shortPercentOfFloat ?? 0) > (best.shortPercentOfFloat ?? 0) ? s : best, withData[0]);
    const squeezeCount = data.filter(isSqueezeRisk).length;
    const avgShortFloat = withData.length > 0
      ? withData.reduce((sum, s) => sum + (s.shortPercentOfFloat ?? 0), 0) / withData.length
      : 0;
    return { highShortCount, avgShortRatio, highestShort, squeezeCount, avgShortFloat, total: data.length };
  }, [data]);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: t('siHighShort') },
    { key: 'squeeze', label: t('siSqueezeRisk') },
    { key: 'increasing', label: t('siIncreasing') },
    { key: 'decreasing', label: t('siDecreasing') },
  ];

  const SortHeader = ({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`text-left text-[8px] uppercase tracking-wider font-medium transition-colors ${sortKey === k ? 'text-rose-400' : 'text-neutral/40 hover:text-neutral/60'} ${className}`}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '\u25BE' : '\u25B4') : ''}
    </button>
  );

  return (
    <GlassCard className="h-full flex flex-col overflow-hidden bg-black/90">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-rose-500/10">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-[11px] font-mono font-bold text-rose-400 tracking-widest uppercase">
            {t('panelShortInterest')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="text-neutral/30 hover:text-rose-400 transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border/5 text-[9px] font-mono bg-rose-500/[0.03]">
          <span className="text-neutral/50">
            &gt;20% Float: <span className="text-rose-400 font-bold">{summary.highShortCount}</span>
          </span>
          <span className="text-neutral/50">
            Avg Ratio: <span className="text-orange-400 font-bold">{summary.avgShortRatio.toFixed(1)}d</span>
          </span>
          {summary.highestShort && (
            <span className="text-neutral/50">
              Top: <span className="text-red-400 font-bold">{summary.highestShort.symbol}</span>
              <span className="text-red-400/70 ml-1">{formatPercent(summary.highestShort.shortPercentOfFloat)}</span>
            </span>
          )}
          {summary.squeezeCount > 0 && (
            <span className="text-neutral/50">
              <AlertTriangle className="w-2.5 h-2.5 inline text-yellow-400 mr-0.5" />
              Squeeze Risk: <span className="text-yellow-400 font-bold">{summary.squeezeCount}</span>
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 px-3 py-1.5 border-b border-border/5">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-2 py-0.5 text-[8px] font-mono uppercase tracking-wider rounded transition-colors ${
              filter === tab.key
                ? 'bg-rose-500/20 text-rose-400 font-bold'
                : 'text-neutral/40 hover:text-neutral/60 hover:bg-white/[0.02]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-5 h-5 border-2 border-rose-400/30 border-t-rose-400 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-[10px] font-mono text-bearish/60">
            Failed to load short interest data
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[10px] font-mono text-neutral/30">
            {t('siNoData')}
          </div>
        ) : (
          <table className="w-full text-[9px] font-mono">
            <thead className="sticky top-0 bg-black/95 z-10">
              <tr className="border-b border-border/10">
                <th className="px-2 py-1.5 text-left"><SortHeader k="symbol" label="Symbol" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="price" label="Price" className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="changePercent" label="Chg%" className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="shortPercentOfFloat" label={t('siShortFloat')} className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="shortRatio" label={t('siShortRatio')} className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="sharesShort" label={t('siSharesShort')} className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="shortChangePercent" label={t('siMoMChange')} className="justify-end" /></th>
                <th className="px-1 py-1.5 text-right"><SortHeader k="volumeRatio" label="Vol/Avg" className="justify-end" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((stock, i) => {
                const volumeRatio = stock.avgVolume && stock.avgVolume > 0
                  ? stock.volume / stock.avgVolume
                  : null;
                const squeeze = isSqueezeRisk(stock);
                const shortPct = stock.shortPercentOfFloat != null ? stock.shortPercentOfFloat * 100 : 0;
                const barWidth = Math.min(shortPct / 50 * 100, 100);

                return (
                  <tr
                    key={`${stock.symbol}-${i}`}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className="border-b border-border/5 hover:bg-rose-500/[0.04] transition-colors cursor-pointer group"
                  >
                    {/* Symbol + Name */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-rose-400 text-[10px]">{stock.symbol}</span>
                        {squeeze && (
                          <span className="px-1 py-px text-[7px] font-bold uppercase bg-yellow-500/20 text-yellow-400 rounded">
                            {t('siSqueezeAlert')}
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] text-neutral/30 truncate max-w-[120px]">{stock.name}</div>
                    </td>

                    {/* Price */}
                    <td className="px-1 py-1.5 text-right text-neutral/70 tabular-nums">
                      ${stock.price.toFixed(2)}
                    </td>

                    {/* Change % */}
                    <td className={`px-1 py-1.5 text-right tabular-nums ${
                      stock.changePercent > 0 ? 'text-bullish' : stock.changePercent < 0 ? 'text-bearish' : 'text-neutral/50'
                    }`}>
                      {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </td>

                    {/* Short % Float - key column */}
                    <td className="px-1 py-1.5 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-[11px] font-bold tabular-nums ${shortFloatColor(stock.shortPercentOfFloat)}`}>
                          {formatPercent(stock.shortPercentOfFloat)}
                        </span>
                        <div className="w-14 h-1 bg-neutral/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              shortPct >= 30 ? 'bg-red-400' : shortPct >= 20 ? 'bg-orange-400' : shortPct >= 10 ? 'bg-yellow-400' : 'bg-neutral/20'
                            }`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Short Ratio (days to cover) */}
                    <td className={`px-1 py-1.5 text-right tabular-nums ${shortRatioColor(stock.shortRatio)}`}>
                      {stock.shortRatio != null ? stock.shortRatio.toFixed(1) + 'd' : '-'}
                    </td>

                    {/* Shares Short */}
                    <td className="px-1 py-1.5 text-right text-neutral/60 tabular-nums">
                      {formatNumber(stock.sharesShort)}
                    </td>

                    {/* MoM Change */}
                    <td className="px-1 py-1.5 text-right">
                      {stock.shortChangePercent != null ? (
                        <span className={`inline-flex items-center gap-0.5 tabular-nums ${
                          stock.shortChangePercent > 0 ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {stock.shortChangePercent > 0
                            ? <ArrowUp className="w-2.5 h-2.5" />
                            : <ArrowDown className="w-2.5 h-2.5" />
                          }
                          {formatRawPercent(Math.abs(stock.shortChangePercent))}
                        </span>
                      ) : (
                        <span className="text-neutral/30">-</span>
                      )}
                    </td>

                    {/* Volume vs Avg */}
                    <td className="px-1 py-1.5 text-right">
                      {volumeRatio != null ? (
                        <span className={`tabular-nums ${
                          volumeRatio >= 2 ? 'text-rose-400 font-bold' : volumeRatio >= 1.5 ? 'text-orange-400' : 'text-neutral/50'
                        }`}>
                          {volumeRatio.toFixed(1)}x
                        </span>
                      ) : (
                        <span className="text-neutral/30">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Status bar */}
      {summary && (
        <div className="flex items-center gap-4 px-3 py-1 border-t border-border/5 text-[8px] font-mono text-neutral/30 bg-black/95">
          <span>Total: {summary.total}</span>
          <span>Avg Short Float: {formatPercent(summary.avgShortFloat)}</span>
          {summary.squeezeCount > 0 && (
            <span className="text-yellow-400">
              <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />
              {summary.squeezeCount} squeeze risk
            </span>
          )}
          <span className="ml-auto">{sorted.length} shown</span>
        </div>
      )}
    </GlassCard>
  );
}
