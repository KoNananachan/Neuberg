import { useState, useMemo, useCallback } from 'react';
import { GlassCard } from '../common/glass-card';
import { useDividends, type DividendStock } from '../../api/hooks/use-dividends';
import { useAppStore } from '../../stores/use-app-store';
import { DollarSign, RefreshCw } from 'lucide-react';
import { useT } from '../../i18n';

type ViewMode = 'calendar' | 'screener';
type FilterTab = 'all' | 'high' | 'aristocrats' | 'reits' | 'etfs';
type SortKey = 'yield' | 'symbol' | 'price' | 'annual' | 'exDate' | 'payDate' | 'payout' | 'avg5y';
type SortDir = 'asc' | 'desc';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' });
}

function isWithinDays(dateStr: string, days: number): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function isPast(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
}

function yieldColor(y: number | null): string {
  if (y == null || y <= 0) return '';
  if (y >= 5) return 'text-bullish';
  if (y >= 3) return 'text-green-400';
  if (y >= 2) return 'text-green-500/80';
  return 'text-neutral/80';
}

function yieldBg(y: number | null): string {
  if (y == null || y <= 0) return '';
  if (y >= 5) return 'bg-bullish/[0.06]';
  if (y >= 3) return 'bg-green-400/[0.04]';
  return '';
}

function applyFilter(stocks: DividendStock[], filter: FilterTab): DividendStock[] {
  switch (filter) {
    case 'high': return stocks.filter(s => (s.dividendYield ?? 0) > 3);
    case 'aristocrats': return stocks.filter(s => s.category === 'aristocrat');
    case 'reits': return stocks.filter(s => s.category === 'reit');
    case 'etfs': return stocks.filter(s => s.category === 'etf');
    default: return stocks;
  }
}

function sortStocks(stocks: DividendStock[], key: SortKey, dir: SortDir): DividendStock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    let av: number | string | null;
    let bv: number | string | null;
    switch (key) {
      case 'symbol': av = a.symbol; bv = b.symbol; break;
      case 'price': av = a.price; bv = b.price; break;
      case 'yield': av = a.dividendYield; bv = b.dividendYield; break;
      case 'annual': av = a.annualDividend; bv = b.annualDividend; break;
      case 'exDate': av = a.exDividendDate ?? ''; bv = b.exDividendDate ?? ''; break;
      case 'payDate': av = a.paymentDate ?? ''; bv = b.paymentDate ?? ''; break;
      case 'payout': av = a.payoutRatio; bv = b.payoutRatio; break;
      case 'avg5y': av = a.fiveYearAvgYield; bv = b.fiveYearAvgYield; break;
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

export function DividendPanel() {
  const t = useT();
  const [view, setView] = useState<ViewMode>('screener');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [sortKey, setSortKey] = useState<SortKey>('yield');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const { data, isLoading, error, refetch } = useDividends();
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
    if (!data?.length) return [];
    return applyFilter(data, filter);
  }, [data, filter]);

  const sorted = useMemo(() => {
    return sortStocks(filtered, sortKey, sortDir);
  }, [filtered, sortKey, sortDir]);

  // Calendar view: group by ex-dividend date
  const calendarGroups = useMemo(() => {
    if (!filtered.length) return [];
    const withDate = filtered.filter(s => s.exDividendDate);
    const map = new Map<string, DividendStock[]>();
    for (const s of withDate) {
      const key = s.exDividendDate!;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    // Sort dates: upcoming first, then past
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const avgYield = useMemo(() => {
    if (!data?.length) return 0;
    const yields = data.filter(s => s.dividendYield != null).map(s => s.dividendYield!);
    if (yields.length === 0) return 0;
    return yields.reduce((sum, y) => sum + y, 0) / yields.length;
  }, [data]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'high', label: t('dvdHighYield') },
    { key: 'aristocrats', label: t('dvdAristocrats') },
    { key: 'reits', label: t('dvdREITs') },
    { key: 'etfs', label: t('dvdETFs') },
  ];

  return (
    <GlassCard
      title={
        <span className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3" />
          {t('panelDividends')}
        </span>
      }
      headerRight={
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-mono text-neutral/50">
            {data?.length ?? 0} {t('symbol').toLowerCase()}s | {t('dvdAvgYield')} {avgYield.toFixed(2)}%
          </span>
          <button
            onClick={() => refetch()}
            className="text-neutral/40 hover:text-accent transition-colors"
            title={t('refresh')}
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      }
      className="h-full"
    >
      {/* View toggle + filter tabs */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-border/30 bg-black/20">
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setView('calendar')}
            className={`px-2 py-0.5 text-[9px] font-mono font-black transition-all ${
              view === 'calendar' ? 'bg-accent/20 text-accent' : 'text-neutral/50 hover:text-white'
            }`}
          >
            {t('dvdCalendar')}
          </button>
          <button
            onClick={() => setView('screener')}
            className={`px-2 py-0.5 text-[9px] font-mono font-black transition-all ${
              view === 'screener' ? 'bg-accent/20 text-accent' : 'text-neutral/50 hover:text-white'
            }`}
          >
            {t('dvdScreener')}
          </button>
        </div>
        <div className="w-px h-3 bg-border/30" />
        <div className="flex items-center gap-0.5 overflow-x-auto no-scrollbar">
          {filterTabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-1.5 py-0.5 text-[8px] font-mono font-bold whitespace-nowrap transition-all ${
                filter === key ? 'bg-accent/15 text-accent' : 'text-neutral/40 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="w-4 h-4 border-2 border-accent/30 border-t-accent animate-spin" />
            <span className="text-[10px] font-mono text-neutral/40 uppercase tracking-widest">{t('loading')}</span>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-[10px] font-mono text-bearish/60 uppercase tracking-widest">{t('dvdNoData')}</span>
            <button onClick={() => refetch()} className="text-[9px] font-mono text-accent hover:text-white border border-accent/30 px-2 py-0.5 transition-colors">{t('retry')}</button>
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="flex items-center justify-center py-8 text-[10px] font-mono text-neutral/40 uppercase tracking-widest">
            {t('dvdNoData')}
          </div>
        )}

        {/* Calendar View */}
        {!isLoading && !error && view === 'calendar' && calendarGroups.length > 0 && (
          <>
            {calendarGroups.map(([dateKey, stocks]) => {
              const upcoming = isWithinDays(dateKey, 7);
              const past = isPast(dateKey);
              return (
                <div key={dateKey}>
                  <div
                    className={`sticky top-0 z-10 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest border-b border-border/20 ${
                      upcoming
                        ? 'bg-accent/10 text-accent border-accent/30'
                        : past
                          ? 'bg-black/40 text-neutral/40'
                          : 'bg-black/40 text-neutral/60'
                    }`}
                  >
                    {formatDate(dateKey)}
                    {upcoming && (
                      <span className="ml-2 px-1 py-0.5 text-[7px] bg-accent/20 text-accent border border-accent/30">
                        {t('dvdUpcoming')}
                      </span>
                    )}
                  </div>

                  {stocks.map((stock, i) => (
                    <button
                      key={`${stock.symbol}-${i}`}
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 border-b border-border/5 hover:bg-accent/[0.04] transition-colors text-left ${yieldBg(stock.dividendYield)}`}
                    >
                      <span className="text-[10px] font-mono font-black text-accent w-12 shrink-0">{stock.symbol}</span>
                      <span className={`text-[12px] font-mono font-bold w-14 text-right shrink-0 ${yieldColor(stock.dividendYield)}`}>
                        {stock.dividendYield != null ? stock.dividendYield.toFixed(2) + '%' : '--'}
                      </span>
                      <span className="text-[9px] font-mono text-neutral/50 w-14 text-right shrink-0">
                        {stock.annualDividend != null ? '$' + stock.annualDividend.toFixed(2) : '--'}
                      </span>
                      <span className="text-[8px] font-mono text-neutral/40 truncate flex-1">
                        {stock.paymentDate ? 'Pay: ' + formatDate(stock.paymentDate) : ''}
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            {/* Stocks without ex-div dates */}
            {filtered.filter(s => !s.exDividendDate).length > 0 && (
              <div>
                <div className="sticky top-0 z-10 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest border-b border-border/20 bg-black/40 text-neutral/40">
                  {t('dvdNoData')}
                </div>
                {filtered.filter(s => !s.exDividendDate).map((stock, i) => (
                  <button
                    key={`nodate-${stock.symbol}-${i}`}
                    onClick={() => setSelectedSymbol(stock.symbol)}
                    className="w-full flex items-center gap-3 px-3 py-1.5 border-b border-border/5 hover:bg-accent/[0.04] transition-colors text-left"
                  >
                    <span className="text-[10px] font-mono font-black text-accent w-12 shrink-0">{stock.symbol}</span>
                    <span className={`text-[12px] font-mono font-bold w-14 text-right shrink-0 ${yieldColor(stock.dividendYield)}`}>
                      {stock.dividendYield != null ? stock.dividendYield.toFixed(2) + '%' : '--'}
                    </span>
                    <span className="text-[9px] font-mono text-neutral/50 w-14 text-right shrink-0">
                      {stock.annualDividend != null ? '$' + stock.annualDividend.toFixed(2) : '--'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Screener View */}
        {!isLoading && !error && view === 'screener' && sorted.length > 0 && (
          <>
            {/* Table header */}
            <div className="sticky top-0 z-10 grid grid-cols-[50px_55px_55px_50px_72px_72px_50px_50px] text-[7px] font-mono text-neutral/40 uppercase tracking-wider px-3 py-1 border-b border-border/20 bg-black/60">
              <button className="text-left hover:text-white transition-colors" onClick={() => handleSort('symbol')}>
                {t('symbol')}{sortIndicator('symbol')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('price')}>
                {t('price')}{sortIndicator('price')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('yield')}>
                {t('dvdYield')}{sortIndicator('yield')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('annual')}>
                {t('dvdAnnual')}{sortIndicator('annual')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('exDate')}>
                {t('dvdExDate')}{sortIndicator('exDate')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('payDate')}>
                {t('dvdPayDate')}{sortIndicator('payDate')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('payout')}>
                {t('dvdPayout')}{sortIndicator('payout')}
              </button>
              <button className="text-right hover:text-white transition-colors" onClick={() => handleSort('avg5y')}>
                {t('dvd5yAvg')}{sortIndicator('avg5y')}
              </button>
            </div>

            {/* Table rows */}
            {sorted.map((stock, i) => (
              <button
                key={`${stock.symbol}-${i}`}
                onClick={() => setSelectedSymbol(stock.symbol)}
                className={`w-full grid grid-cols-[50px_55px_55px_50px_72px_72px_50px_50px] text-[9px] font-mono px-3 py-1.5 border-b border-border/5 hover:bg-accent/[0.04] transition-colors text-left ${yieldBg(stock.dividendYield)}`}
              >
                <span className="font-black text-accent truncate">{stock.symbol}</span>
                <span className="text-right text-neutral/70">${stock.price.toFixed(2)}</span>
                <span className={`text-right font-bold ${yieldColor(stock.dividendYield)}`}>
                  {stock.dividendYield != null ? stock.dividendYield.toFixed(2) + '%' : '--'}
                </span>
                <span className="text-right text-neutral/60">
                  {stock.annualDividend != null ? '$' + stock.annualDividend.toFixed(2) : '--'}
                </span>
                <span className={`text-right text-[8px] ${stock.exDividendDate && isWithinDays(stock.exDividendDate, 7) ? 'text-accent font-bold' : 'text-neutral/50'}`}>
                  {stock.exDividendDate ? formatDate(stock.exDividendDate) : '--'}
                </span>
                <span className="text-right text-[8px] text-neutral/50">
                  {stock.paymentDate ? formatDate(stock.paymentDate) : '--'}
                </span>
                <span className="text-right text-neutral/50">
                  {stock.payoutRatio != null ? stock.payoutRatio.toFixed(0) + '%' : '--'}
                </span>
                <span className="text-right text-neutral/50">
                  {stock.fiveYearAvgYield != null ? stock.fiveYearAvgYield.toFixed(2) + '%' : '--'}
                </span>
              </button>
            ))}
          </>
        )}
      </div>
    </GlassCard>
  );
}
