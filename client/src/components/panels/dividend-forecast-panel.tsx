import { useState, useMemo, useCallback } from 'react';
import {
  useDividendForecast,
  type DividendForecastStock,
  type DividendForecastResponse,
} from '../../api/hooks/use-dividend-forecast';
import { useT } from '../../i18n';
import { RefreshCw } from 'lucide-react';

// ── i18n fallback helper ──

type TFn = ReturnType<typeof useT>;
const tr = (t: TFn, key: string, fallback: string): string => {
  try {
    return (t as (k: string) => string)(key) || fallback;
  } catch {
    return fallback;
  }
};

// ── Types ──

type ViewMode = 'TABLE' | 'CALENDAR' | 'GROWTH';
type SortKey = 'ticker' | 'forwardYield' | 'payoutRatio' | 'dividendGrowth1Y' | 'dividendGrowth5Y' | 'safetyScore' | 'consecutiveYears' | 'nextExDate';
type SortDir = 'asc' | 'desc';

// ── Color helpers ──

function safetyColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function safetyBg(score: number): string {
  if (score >= 80) return 'bg-green-500/15';
  if (score >= 60) return 'bg-yellow-500/15';
  if (score >= 40) return 'bg-orange-500/15';
  return 'bg-red-500/15';
}

function ratingColor(rating: string): string {
  if (rating === 'Strong Buy') return 'text-green-400';
  if (rating === 'Buy') return 'text-teal-400';
  if (rating === 'Hold') return 'text-yellow-400';
  return 'text-red-400';
}

function ratingBg(rating: string): string {
  if (rating === 'Strong Buy') return 'bg-green-500/15 border-green-500/30';
  if (rating === 'Buy') return 'bg-teal-500/15 border-teal-500/30';
  if (rating === 'Hold') return 'bg-yellow-500/15 border-yellow-500/30';
  return 'bg-red-500/15 border-red-500/30';
}

function growthColor(n: number): string {
  if (n > 8) return 'text-green-400';
  if (n > 3) return 'text-teal-400';
  if (n > 0) return 'text-yellow-400';
  return 'text-red-400';
}

function growthBarColor(n: number): string {
  if (n > 8) return 'bg-green-400';
  if (n > 3) return 'bg-teal-400';
  if (n > 0) return 'bg-yellow-400';
  return 'bg-red-400';
}

function yieldColor(y: number): string {
  if (y >= 4) return 'text-green-400';
  if (y >= 2.5) return 'text-teal-400';
  if (y >= 1) return 'text-neutral-300';
  return 'text-neutral-500';
}

// ── Formatting ──

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtDateWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const start = new Date(d);
  start.setDate(start.getDate() - start.getDay()); // Sunday
  const end = new Date(start);
  end.setDate(end.getDate() + 6); // Saturday
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(start)} - ${fmt(end)}`;
}

// ── Sort helper ──

function sortStocks(stocks: DividendForecastStock[], key: SortKey, dir: SortDir): DividendForecastStock[] {
  const sorted = [...stocks];
  sorted.sort((a, b) => {
    let av: number | string;
    let bv: number | string;
    switch (key) {
      case 'ticker': av = a.ticker; bv = b.ticker; break;
      case 'forwardYield': av = a.forwardYield; bv = b.forwardYield; break;
      case 'payoutRatio': av = a.payoutRatio; bv = b.payoutRatio; break;
      case 'dividendGrowth1Y': av = a.dividendGrowth1Y; bv = b.dividendGrowth1Y; break;
      case 'dividendGrowth5Y': av = a.dividendGrowth5Y; bv = b.dividendGrowth5Y; break;
      case 'safetyScore': av = a.safetyScore; bv = b.safetyScore; break;
      case 'consecutiveYears': av = a.consecutiveYears; bv = b.consecutiveYears; break;
      case 'nextExDate': av = a.nextExDate; bv = b.nextExDate; break;
      default: return 0;
    }
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dir === 'asc' ? cmp : -cmp;
  });
  return sorted;
}

// ── Main Panel ──

export function DividendForecastPanel() {
  const t = useT();
  const { data: response, isLoading, refetch } = useDividendForecast();
  const [view, setView] = useState<ViewMode>('TABLE');
  const [sortKey, setSortKey] = useState<SortKey>('forwardYield');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const stocks = response?.data ?? [];

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }, [sortKey]);

  const sorted = useMemo(() => sortStocks(stocks, sortKey, sortDir), [stocks, sortKey, sortDir]);

  const avgYield = useMemo(() => {
    if (!stocks.length) return 0;
    return stocks.reduce((s, st) => s + st.forwardYield, 0) / stocks.length;
  }, [stocks]);

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
  };

  const views: { key: ViewMode; label: string }[] = [
    { key: 'TABLE', label: tr(t, 'dfTable', 'TABLE') },
    { key: 'CALENDAR', label: tr(t, 'dfCalendar', 'CALENDAR') },
    { key: 'GROWTH', label: tr(t, 'dfGrowth', 'GROWTH') },
  ];

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {tr(t, 'dfTitle', 'Dividend Forecast')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[7px] font-mono text-neutral-500">
            {stocks.length} {tr(t, 'dfStocks', 'stocks')} | {tr(t, 'dfAvgYield', 'Avg Yield')} {avgYield.toFixed(2)}%
          </span>
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-teal-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* View tabs */}
      <div className="shrink-0 flex items-center gap-0.5 px-3 py-1 border-b border-border/20 bg-[#030303]">
        {views.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-2 py-0.5 text-[8px] font-mono font-black uppercase tracking-wider transition-all ${
              view === key
                ? 'bg-teal-400/20 text-teal-400'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !response && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {tr(t, 'loading', 'Loading...')}
          </div>
        )}

        {!response && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr(t, 'dfNoData', 'No data available')}
          </div>
        )}

        {response && view === 'TABLE' && (
          <TableView
            stocks={sorted}
            sortKey={sortKey}
            sortIndicator={sortIndicator}
            onSort={handleSort}
            t={t}
          />
        )}

        {response && view === 'CALENDAR' && (
          <CalendarView stocks={stocks} t={t} />
        )}

        {response && view === 'GROWTH' && (
          <GrowthView stocks={stocks} t={t} />
        )}
      </div>
    </div>
  );
}

// ── TABLE View ──

function TableView({
  stocks,
  sortKey,
  sortIndicator,
  onSort,
  t,
}: {
  stocks: DividendForecastStock[];
  sortKey: SortKey;
  sortIndicator: (key: SortKey) => string;
  onSort: (key: SortKey) => void;
  t: TFn;
}) {
  const cols: { key: SortKey; label: string; align: string }[] = [
    { key: 'ticker', label: tr(t, 'dfTicker', 'Ticker'), align: 'text-left' },
    { key: 'forwardYield', label: tr(t, 'dfYield', 'Fwd Yld'), align: 'text-right' },
    { key: 'payoutRatio', label: tr(t, 'dfPayout', 'Payout'), align: 'text-right' },
    { key: 'dividendGrowth1Y', label: tr(t, 'dfGr1Y', '1Y Gr'), align: 'text-right' },
    { key: 'dividendGrowth5Y', label: tr(t, 'dfGr5Y', '5Y Gr'), align: 'text-right' },
    { key: 'safetyScore', label: tr(t, 'dfSafety', 'Safety'), align: 'text-right' },
    { key: 'consecutiveYears', label: tr(t, 'dfYears', 'Yrs'), align: 'text-right' },
    { key: 'nextExDate', label: tr(t, 'dfExDate', 'Ex-Date'), align: 'text-right' },
  ];

  return (
    <>
      {/* Table header */}
      <div className="sticky top-0 z-10 grid grid-cols-[52px_50px_46px_46px_46px_44px_36px_64px_56px] gap-0 px-2 py-0.5 border-b border-border/20 bg-[#030303]">
        {cols.map((col) => (
          <button
            key={col.key}
            onClick={() => onSort(col.key)}
            className={`text-[7px] font-mono text-neutral-600 uppercase tracking-wider hover:text-white transition-colors ${col.align}`}
          >
            {col.label}{sortIndicator(col.key)}
          </button>
        ))}
        <span className="text-[7px] font-mono text-neutral-600 uppercase tracking-wider text-center">
          {tr(t, 'dfRating', 'Rating')}
        </span>
      </div>

      {/* Table rows */}
      {stocks.map((stock) => {
        const days = daysUntil(stock.nextExDate);
        const exDateUrgent = days >= 0 && days <= 7;

        return (
          <div
            key={stock.ticker}
            className="grid grid-cols-[52px_50px_46px_46px_46px_44px_36px_64px_56px] gap-0 px-2 py-[3px] border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors items-center"
          >
            {/* Ticker */}
            <div className="flex flex-col">
              <span className="text-[9px] font-mono font-black text-teal-400">{stock.ticker}</span>
              <span className="text-[6px] font-mono text-neutral-600 truncate">{stock.sector}</span>
            </div>

            {/* Forward Yield */}
            <span className={`text-[9px] font-mono font-bold text-right ${yieldColor(stock.forwardYield)}`}>
              {stock.forwardYield.toFixed(2)}%
            </span>

            {/* Payout Ratio */}
            <span className={`text-[9px] font-mono text-right ${stock.payoutRatio > 80 ? 'text-red-400' : stock.payoutRatio > 60 ? 'text-yellow-400' : 'text-neutral-400'}`}>
              {stock.payoutRatio.toFixed(0)}%
            </span>

            {/* 1Y Growth */}
            <span className={`text-[9px] font-mono text-right ${growthColor(stock.dividendGrowth1Y)}`}>
              {stock.dividendGrowth1Y > 0 ? '+' : ''}{stock.dividendGrowth1Y.toFixed(1)}%
            </span>

            {/* 5Y Growth */}
            <span className={`text-[9px] font-mono text-right ${growthColor(stock.dividendGrowth5Y)}`}>
              {stock.dividendGrowth5Y > 0 ? '+' : ''}{stock.dividendGrowth5Y.toFixed(1)}%
            </span>

            {/* Safety Score */}
            <div className="flex items-center justify-end gap-1">
              <div className={`w-1 h-1 ${safetyBg(stock.safetyScore)}`} />
              <span className={`text-[9px] font-mono font-bold ${safetyColor(stock.safetyScore)}`}>
                {stock.safetyScore}
              </span>
            </div>

            {/* Consecutive Years */}
            <span className="text-[9px] font-mono text-right text-neutral-400">
              {stock.consecutiveYears}
            </span>

            {/* Next Ex-Date */}
            <span className={`text-[8px] font-mono text-right ${exDateUrgent ? 'text-teal-400 font-bold' : 'text-neutral-500'}`}>
              {fmtDate(stock.nextExDate)}
              {exDateUrgent && days >= 0 && (
                <span className="ml-0.5 text-[6px] text-teal-400/70">{days}d</span>
              )}
            </span>

            {/* Rating */}
            <span className={`text-[7px] font-mono font-black uppercase text-center px-1 py-0.5 border ${ratingBg(stock.rating)} ${ratingColor(stock.rating)}`}>
              {stock.rating === 'Strong Buy' ? 'STR BUY' : stock.rating === 'Cut Risk' ? 'CUT' : stock.rating.toUpperCase()}
            </span>
          </div>
        );
      })}
    </>
  );
}

// ── CALENDAR View ──

function CalendarView({
  stocks,
  t,
}: {
  stocks: DividendForecastStock[];
  t: TFn;
}) {
  const weekGroups = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => a.nextExDate.localeCompare(b.nextExDate));
    const groups = new Map<string, DividendForecastStock[]>();

    for (const stock of sorted) {
      const week = getWeekKey(stock.nextExDate);
      if (!groups.has(week)) groups.set(week, []);
      groups.get(week)!.push(stock);
    }

    return Array.from(groups.entries());
  }, [stocks]);

  return (
    <>
      {weekGroups.map(([weekLabel, weekStocks]) => {
        const firstDate = weekStocks[0]?.nextExDate ?? '';
        const days = daysUntil(firstDate);
        const isThisWeek = days >= 0 && days <= 7;
        const isPast = days < 0;

        return (
          <div key={weekLabel}>
            {/* Week header */}
            <div
              className={`sticky top-0 z-10 px-3 py-1 text-[8px] font-mono font-black uppercase tracking-wider border-b border-border/20 flex items-center gap-2 ${
                isThisWeek
                  ? 'bg-teal-400/10 text-teal-400 border-teal-400/30'
                  : isPast
                    ? 'bg-black/40 text-neutral-600'
                    : 'bg-[#050505] text-neutral-500'
              }`}
            >
              <span>{weekLabel}</span>
              {isThisWeek && (
                <span className="px-1 py-0.5 text-[6px] bg-teal-400/20 text-teal-400 border border-teal-400/30">
                  {tr(t, 'dfThisWeek', 'THIS WEEK')}
                </span>
              )}
              <span className="ml-auto text-[7px] text-neutral-600">
                {weekStocks.length} {weekStocks.length === 1 ? 'stock' : 'stocks'}
              </span>
            </div>

            {/* Stocks in this week */}
            {weekStocks.map((stock) => {
              const d = daysUntil(stock.nextExDate);
              return (
                <div
                  key={stock.ticker}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
                >
                  {/* Date badge */}
                  <div className={`w-14 shrink-0 text-[8px] font-mono font-bold ${d >= 0 && d <= 3 ? 'text-teal-400' : 'text-neutral-500'}`}>
                    {fmtDateWeek(stock.nextExDate)}
                  </div>

                  {/* Ticker + name */}
                  <div className="flex flex-col min-w-0 w-20 shrink-0">
                    <span className="text-[9px] font-mono font-black text-teal-400">{stock.ticker}</span>
                    <span className="text-[6px] font-mono text-neutral-600 truncate">{stock.name}</span>
                  </div>

                  {/* Yield */}
                  <div className="flex flex-col items-end w-12 shrink-0">
                    <span className={`text-[9px] font-mono font-bold ${yieldColor(stock.forwardYield)}`}>
                      {stock.forwardYield.toFixed(2)}%
                    </span>
                    <span className="text-[6px] font-mono text-neutral-600">yield</span>
                  </div>

                  {/* Quarterly dividend */}
                  <div className="flex flex-col items-end w-12 shrink-0">
                    <span className="text-[9px] font-mono text-neutral-300">
                      ${(stock.annualDividend / (stock.frequency === 'quarterly' ? 4 : stock.frequency === 'monthly' ? 12 : 2)).toFixed(2)}
                    </span>
                    <span className="text-[6px] font-mono text-neutral-600">per qtr</span>
                  </div>

                  {/* Pay date */}
                  <div className="flex flex-col items-end flex-1 min-w-0">
                    <span className="text-[8px] font-mono text-neutral-500">
                      Pay: {fmtDate(stock.nextPayDate)}
                    </span>
                    <span className="text-[6px] font-mono text-neutral-600">{stock.frequency}</span>
                  </div>

                  {/* Safety */}
                  <div className={`px-1 py-0.5 text-[7px] font-mono font-bold ${safetyColor(stock.safetyScore)} ${safetyBg(stock.safetyScore)} shrink-0`}>
                    {stock.safetyScore}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

// ── GROWTH View ──

function GrowthView({
  stocks,
  t,
}: {
  stocks: DividendForecastStock[];
  t: TFn;
}) {
  const sorted = useMemo(
    () => [...stocks].sort((a, b) => b.dividendGrowth5Y - a.dividendGrowth5Y),
    [stocks],
  );

  const maxGrowth = useMemo(() => {
    const allValues = stocks.flatMap((s) => [Math.abs(s.dividendGrowth1Y), Math.abs(s.dividendGrowth5Y)]);
    return Math.max(...allValues, 1);
  }, [stocks]);

  return (
    <>
      {/* Legend */}
      <div className="sticky top-0 z-10 flex items-center gap-4 px-3 py-1 border-b border-border/20 bg-[#030303]">
        <div className="flex items-center gap-1">
          <div className="w-2 h-1.5 bg-teal-400/80" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {tr(t, 'dfGrowth1Y', '1Y Growth')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-1.5 bg-teal-400/30 border border-teal-400/50" />
          <span className="text-[7px] font-mono text-neutral-500 uppercase">
            {tr(t, 'dfGrowth5Y', '5Y CAGR')}
          </span>
        </div>
        <div className="flex-1" />
        <span className="text-[7px] font-mono text-neutral-600 uppercase">
          {tr(t, 'dfSorted', 'Sorted by 5Y CAGR')}
        </span>
      </div>

      {/* Growth bars */}
      {sorted.map((stock) => {
        const bar1Y = Math.abs(stock.dividendGrowth1Y) / maxGrowth * 100;
        const bar5Y = Math.abs(stock.dividendGrowth5Y) / maxGrowth * 100;
        const is1YNeg = stock.dividendGrowth1Y < 0;
        const is5YNeg = stock.dividendGrowth5Y < 0;

        return (
          <div
            key={stock.ticker}
            className="px-3 py-1.5 border-b border-border/5 hover:bg-teal-400/[0.02] transition-colors"
          >
            {/* Top row: ticker, name, safety, rating */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono font-black text-teal-400 w-10 shrink-0">
                {stock.ticker}
              </span>
              <span className="text-[7px] font-mono text-neutral-600 truncate flex-1">
                {stock.name} | {stock.consecutiveYears}yr streak
              </span>
              <span className={`text-[7px] font-mono font-bold ${safetyColor(stock.safetyScore)}`}>
                {stock.safetyScore}
              </span>
              <span className={`text-[6px] font-mono font-black uppercase px-1 py-0.5 border ${ratingBg(stock.rating)} ${ratingColor(stock.rating)}`}>
                {stock.rating === 'Strong Buy' ? 'STR BUY' : stock.rating === 'Cut Risk' ? 'CUT' : stock.rating.toUpperCase()}
              </span>
            </div>

            {/* 1Y bar */}
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[7px] font-mono text-neutral-600 w-8 text-right shrink-0">1Y</span>
              <div className="flex-1 h-2 bg-neutral-900 relative">
                <div
                  className={`h-full ${is1YNeg ? 'bg-red-400/80' : 'bg-teal-400/80'} transition-all`}
                  style={{ width: `${Math.min(bar1Y, 100)}%` }}
                />
              </div>
              <span className={`text-[8px] font-mono font-bold w-12 text-right shrink-0 ${growthColor(stock.dividendGrowth1Y)}`}>
                {stock.dividendGrowth1Y > 0 ? '+' : ''}{stock.dividendGrowth1Y.toFixed(1)}%
              </span>
            </div>

            {/* 5Y bar */}
            <div className="flex items-center gap-1.5">
              <span className="text-[7px] font-mono text-neutral-600 w-8 text-right shrink-0">5Y</span>
              <div className="flex-1 h-2 bg-neutral-900 relative">
                <div
                  className={`h-full border ${is5YNeg ? 'bg-red-400/30 border-red-400/50' : 'bg-teal-400/30 border-teal-400/50'} transition-all`}
                  style={{ width: `${Math.min(bar5Y, 100)}%` }}
                />
              </div>
              <span className={`text-[8px] font-mono font-bold w-12 text-right shrink-0 ${growthColor(stock.dividendGrowth5Y)}`}>
                {stock.dividendGrowth5Y > 0 ? '+' : ''}{stock.dividendGrowth5Y.toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}
