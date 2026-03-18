import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useIPO, type IPOEntry } from '../../api/hooks/use-ipo';
import { useAppStore } from '../../stores/use-app-store';
import { CalendarPlus, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

type FilterTab = 'all' | 'upcoming' | 'priced' | 'trading';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatPrice(price: number | null): string {
  if (price == null) return '-';
  return `$${price.toFixed(2)}`;
}

function formatReturn(pct: number | null): string {
  if (pct == null) return '-';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

function returnColor(pct: number | null): string {
  if (pct == null) return 'text-neutral/50';
  if (pct >= 50) return 'text-bullish font-bold';
  if (pct > 0) return 'text-bullish';
  if (pct < -30) return 'text-bearish font-bold';
  return 'text-bearish';
}

function statusBadge(status: string): string {
  switch (status) {
    case 'upcoming': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'priced': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'trading': return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default: return 'bg-neutral/10 text-neutral/50';
  }
}

function groupByDate(entries: IPOEntry[]): Map<string, IPOEntry[]> {
  const groups = new Map<string, IPOEntry[]>();
  for (const entry of entries) {
    const key = entry.ipoDate;
    const existing = groups.get(key);
    if (existing) {
      existing.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }
  return groups;
}

export function IPOPanel() {
  const t = useT();
  const { data, isLoading, refetch, dataUpdatedAt } = useIPO();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const [filter, setFilter] = useState<FilterTab>('all');

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data;
    return data.filter((e) => e.status === filter);
  }, [data, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const stats = useMemo(() => {
    if (!data) return { total: 0, avgReturn: 0, trading: 0, upcoming: 0 };
    const tradingEntries = data.filter((e) => e.status === 'trading' && e.changeFromIPO != null);
    const avgReturn = tradingEntries.length > 0
      ? tradingEntries.reduce((sum, e) => sum + (e.changeFromIPO ?? 0), 0) / tradingEntries.length
      : 0;
    return {
      total: data.length,
      avgReturn,
      trading: data.filter((e) => e.status === 'trading').length,
      upcoming: data.filter((e) => e.status === 'upcoming').length,
    };
  }, [data]);

  const handleRowClick = useCallback((entry: IPOEntry) => {
    if (entry.status === 'trading') {
      setSelectedSymbol(entry.symbol);
    }
  }, [setSelectedSymbol]);

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('scan_all') },
    { key: 'upcoming', label: t('ipoUpcoming') },
    { key: 'priced', label: t('ipoPriced') },
    { key: 'trading', label: t('ipoTrading') },
  ];

  return (
    <GlassCard
      className="h-full"
      title={
        <span className="flex items-center gap-1.5">
          <CalendarPlus size={13} className="text-accent" />
          {t('panelIPO')}
        </span>
      }
      headerRight={
        <button
          onClick={() => refetch()}
          className="text-neutral/40 hover:text-accent transition-colors p-0.5"
          title="Refresh"
        >
          <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
        </button>
      }
    >
      {/* Filter tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-border bg-black/40 shrink-0">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider transition-colors ${
              filter === tab.key
                ? 'text-accent bg-accent/10 border border-accent/30'
                : 'text-neutral/40 hover:text-neutral/70 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading && !data ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest animate-pulse">
              {t('loading')}
            </span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
              {t('ipoNoData')}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[10px]">
            {/* Table header */}
            <div className="grid grid-cols-[70px_50px_1fr_55px_55px_55px_60px_60px] gap-px px-2 py-1 border-b border-border bg-black/60 text-neutral/40 uppercase tracking-wider sticky top-0 z-10">
              <span>{t('ipoDate')}</span>
              <span>{t('ipoExchange')}</span>
              <span>Symbol / Name</span>
              <span>{t('ipoSector')}</span>
              <span className="text-right">{t('ipoPrice')}</span>
              <span className="text-right">Price</span>
              <span className="text-right">{t('ipoReturn')}</span>
              <span className="text-center">Status</span>
            </div>

            {/* Grouped rows */}
            {Array.from(grouped.entries()).map(([date, entries]) => (
              <div key={date}>
                {/* Date divider */}
                <div className="px-2 py-0.5 bg-black/30 border-b border-border/50">
                  <span className="text-[9px] text-accent/70 tracking-wider font-bold">
                    {formatDate(date)}
                  </span>
                </div>

                {/* Entries */}
                {entries.map((entry) => {
                  const isUpcoming = entry.status === 'upcoming';
                  return (
                    <div
                      key={entry.symbol}
                      onClick={() => handleRowClick(entry)}
                      className={`grid grid-cols-[70px_50px_1fr_55px_55px_55px_60px_60px] gap-px px-2 py-[3px] border-b border-border/30 transition-colors ${
                        entry.status === 'trading'
                          ? 'hover:bg-accent/5 cursor-pointer'
                          : ''
                      } ${isUpcoming ? 'border-l-2 border-l-amber-500/40' : ''}`}
                    >
                      <span className="text-neutral/40 tabular-nums">{entry.ipoDate.slice(5)}</span>
                      <span className="text-neutral/50">{entry.exchange}</span>
                      <span className="flex items-center gap-1 min-w-0">
                        <span className="text-accent font-bold shrink-0">{entry.symbol}</span>
                        <span className="text-neutral/50 truncate">{entry.name}</span>
                      </span>
                      <span className="text-neutral/40 truncate">{entry.sector}</span>
                      <span className="text-right text-neutral/70 tabular-nums">
                        {entry.ipoPrice != null ? `$${entry.ipoPrice}` : '-'}
                      </span>
                      <span className="text-right tabular-nums text-neutral/80">
                        {formatPrice(entry.currentPrice)}
                      </span>
                      <span className={`text-right tabular-nums ${returnColor(entry.changeFromIPO)}`}>
                        {formatReturn(entry.changeFromIPO)}
                      </span>
                      <span className="flex items-center justify-center">
                        <span className={`text-[8px] px-1.5 py-px uppercase tracking-wider ${statusBadge(entry.status)}`}>
                          {entry.status}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-0.5 border-t border-border bg-black/60 text-[9px] font-mono text-neutral/40 shrink-0">
        <span>
          {stats.total} IPOs
          {stats.upcoming > 0 && ` | ${stats.upcoming} upcoming`}
          {stats.trading > 0 && ` | ${stats.trading} trading`}
        </span>
        <span>
          Avg {t('ipoReturn')}: <span className={stats.avgReturn >= 0 ? 'text-bullish' : 'text-bearish'}>
            {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(1)}%
          </span>
        </span>
        {dataUpdatedAt > 0 && (
          <span className="text-neutral/25">
            {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
        )}
      </div>
    </GlassCard>
  );
}
