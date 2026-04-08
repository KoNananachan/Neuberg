import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  useWatchlist,
  useAddToWatchlist,
  useRemoveFromWatchlist,
  useTickerSearch,
  type WatchlistItem,
  type TickerSuggestion,
} from '../../api/hooks/use-watchlist';
import { useAppStore } from '../../stores/use-app-store';
import { useAuthStore } from '../../stores/use-auth-store';
import { useT } from '../../i18n';
import { Sparkline } from '../common/sparkline';
import {
  ListFilter,
  RefreshCw,
  ArrowUpDown,
  Plus,
  X,
  Search,
  Star,
} from 'lucide-react';

/* ────────────────────────── Types ────────────────────────── */

type SortKey =
  | 'symbol'
  | 'price'
  | 'changePercent'
  | 'volume'
  | 'marketCap'
  | 'dayRange'
  | 'w52Range';

/* ────────────────────────── Helpers ────────────────────────── */

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '--';
  return n.toFixed(decimals);
}

function fmtVol(n: number | null | undefined): string {
  if (n == null) return '--';
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function miniTrend(
  price: number,
  changePercent: number | null,
  dayHigh: number | null,
  dayLow: number | null,
  previousClose: number | null,
): number[] {
  const prev = previousClose ?? price;
  const low = dayLow ?? Math.min(prev, price);
  const high = dayHigh ?? Math.max(prev, price);
  const mid = (prev + price) / 2;
  const cp = changePercent ?? 0;
  if (cp >= 0) {
    return [prev, prev * 0.998, low, mid, high * 0.999, price];
  }
  return [prev, prev * 1.002, high, mid, low * 1.001, price];
}

function pctInRange(
  price: number,
  low: number | null | undefined,
  high: number | null | undefined,
): number | null {
  if (low == null || high == null || high === low) return null;
  return ((price - low) / (high - low)) * 100;
}

/* ────────────────────────── Column Header ────────────────────────── */

function ColHeader({
  label,
  sortKey,
  current,
  asc,
  onClick,
  className = '',
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-0.5 ${className} ${active ? 'text-cyan-400' : ''}`}
    >
      <span>{label}</span>
      {active && (
        <ArrowUpDown
          className="w-2 h-2"
          style={{ transform: asc ? 'none' : 'scaleY(-1)' }}
        />
      )}
    </button>
  );
}

/* ────────────────────────── Range Bar (52W) ────────────────────────── */

function RangeBar({ pct }: { pct: number | null }) {
  if (pct == null) return <span className="text-neutral/30">--</span>;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-1 w-full">
      <div className="flex-1 h-[3px] bg-white/5 relative rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-cyan-400/60 rounded-full"
          style={{ width: `${clamped}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-[5px] h-[5px] rounded-full bg-cyan-400 border border-black"
          style={{ left: `calc(${clamped}% - 2.5px)` }}
        />
      </div>
      <span className="text-[7px] font-mono text-neutral/40 w-7 text-right shrink-0">
        {clamped.toFixed(0)}%
      </span>
    </div>
  );
}

/* ────────────────────────── Main Panel ────────────────────────── */

export function WatchlistPanel() {
  const t = useT();
  const { data: items, isLoading, refetch } = useWatchlist();
  const addMutation = useAddToWatchlist();
  const removeMutation = useRemoveFromWatchlist();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const user = useAuthStore((s) => s.user);

  const [sortKey, setSortKey] = useState<SortKey>('symbol');
  const [sortAsc, setSortAsc] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { data: suggestions } = useTickerSearch(searchInput);

  /* ── Sort handler ── */
  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) setSortAsc(!sortAsc);
      else {
        setSortKey(key);
        setSortAsc(key === 'symbol');
      }
    },
    [sortKey, sortAsc],
  );

  /* ── Sorted data ── */
  const sorted = useMemo(() => {
    if (!items) return [];
    const list = [...items];
    list.sort((a, b) => {
      const qa = a.quote;
      const qb = b.quote;
      let cmp = 0;
      switch (sortKey) {
        case 'symbol':
          cmp = a.symbol.localeCompare(b.symbol);
          break;
        case 'price':
          cmp = (qa?.price ?? 0) - (qb?.price ?? 0);
          break;
        case 'changePercent':
          cmp = (qa?.changePercent ?? 0) - (qb?.changePercent ?? 0);
          break;
        case 'volume':
          cmp = (qa?.volume ?? 0) - (qb?.volume ?? 0);
          break;
        case 'marketCap':
          cmp = (qa?.marketCap ?? 0) - (qb?.marketCap ?? 0);
          break;
        case 'dayRange': {
          const ra =
            qa && qa.dayHigh != null && qa.dayLow != null
              ? qa.dayHigh - qa.dayLow
              : 0;
          const rb =
            qb && qb.dayHigh != null && qb.dayLow != null
              ? qb.dayHigh - qb.dayLow
              : 0;
          cmp = ra - rb;
          break;
        }
        case 'w52Range': {
          const pa = pctInRange(
            qa?.price ?? 0,
            qa?.fiftyTwoWeekLow,
            qa?.fiftyTwoWeekHigh,
          );
          const pb = pctInRange(
            qb?.price ?? 0,
            qb?.fiftyTwoWeekLow,
            qb?.fiftyTwoWeekHigh,
          );
          cmp = (pa ?? -1) - (pb ?? -1);
          break;
        }
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [items, sortKey, sortAsc]);

  /* ── Add symbol ── */
  const handleAdd = useCallback(
    (sym: string) => {
      addMutation.mutate(sym);
      setSearchInput('');
      setShowDropdown(false);
      setHighlightIdx(-1);
    },
    [addMutation],
  );

  /* ── Remove symbol ── */
  const handleRemove = useCallback(
    (e: React.MouseEvent, sym: string) => {
      e.stopPropagation();
      removeMutation.mutate(sym);
    },
    [removeMutation],
  );

  /* ── Keyboard navigation in dropdown ── */
  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const list = suggestions ?? [];
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((prev) => Math.min(prev + 1, list.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightIdx >= 0 && highlightIdx < list.length) {
          handleAdd(list[highlightIdx].symbol);
        } else if (searchInput.trim()) {
          handleAdd(searchInput.trim().toUpperCase());
        }
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
      }
    },
    [suggestions, highlightIdx, searchInput, handleAdd],
  );

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('watchlist')}
          </span>
          {items && (
            <span className="text-[7px] font-mono text-neutral/30">
              {items.length}
            </span>
          )}
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw
            className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* ── Quick Add ── */}
      {user && (
        <div
          className="px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0"
          ref={wrapperRef}
        >
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral/30" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value.toUpperCase());
                setShowDropdown(true);
                setHighlightIdx(-1);
              }}
              onFocus={() => searchInput && setShowDropdown(true)}
              onKeyDown={handleInputKeyDown}
              placeholder={t('addSymbol')}
              className="w-full bg-black border border-border/30 pl-8 pr-2 py-1 text-[9px] font-mono text-white placeholder:text-neutral/20 outline-none focus:border-cyan-400/50 transition-colors"
            />
          </div>

          {/* Suggestions dropdown */}
          {showDropdown && suggestions && suggestions.length > 0 && (
            <div className="absolute z-50 left-3 right-3 mt-0.5 bg-[#0a0a0a] border border-border/30 max-h-40 overflow-auto no-scrollbar">
              {suggestions.map((s: TickerSuggestion, idx: number) => (
                <button
                  key={s.symbol}
                  onClick={() => handleAdd(s.symbol)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-left transition-colors ${
                    idx === highlightIdx
                      ? 'bg-cyan-400/10 text-cyan-400'
                      : 'hover:bg-white/[0.03] text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[9px] font-mono font-bold shrink-0">
                      {s.symbol}
                    </span>
                    <span className="text-[7px] font-mono text-neutral/40 truncate">
                      {s.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[7px] font-mono text-neutral/20">
                      {s.exchange}
                    </span>
                    <Plus className="w-2.5 h-2.5 text-cyan-400/60" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Column Headers ── */}
      <div className="grid grid-cols-[1fr_0.6fr_0.5fr_0.6fr_0.5fr_0.7fr_0.8fr_36px] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider shrink-0 gap-1">
        <ColHeader
          label={t('symbol')}
          sortKey="symbol"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
        />
        <ColHeader
          label={t('price')}
          sortKey="price"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        <ColHeader
          label={t('moversChange')}
          sortKey="changePercent"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        <ColHeader
          label={t('volume')}
          sortKey="volume"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        <ColHeader
          label="MKT CAP"
          sortKey="marketCap"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        <ColHeader
          label="Day H/L"
          sortKey="dayRange"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        <ColHeader
          label="52W"
          sortKey="w52Range"
          current={sortKey}
          asc={sortAsc}
          onClick={handleSort}
          className="text-right"
        />
        {/* Sparkline / remove column - no sort */}
        <span />
      </div>

      {/* ── List ── */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !items && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && (!items || items.length === 0) && (
          <div className="text-center py-8">
            <Star className="w-5 h-5 text-cyan-400/20 mx-auto mb-2" />
            <div className="text-neutral/30 text-[9px] font-mono uppercase">
              {t('addToWatchlist')}
            </div>
          </div>
        )}

        {sorted.map((item: WatchlistItem) => {
          const q = item.quote;
          const chg = q?.changePercent ?? 0;
          const isUp = chg >= 0;

          return (
            <button
              key={item.symbol}
              onClick={() => setSelectedSymbol(item.symbol)}
              className="w-full grid grid-cols-[1fr_0.6fr_0.5fr_0.6fr_0.5fr_0.7fr_0.8fr_36px] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors text-left gap-1 group"
            >
              {/* Symbol + name */}
              <div className="min-w-0 self-center">
                <div className="text-[10px] font-mono font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                  {item.symbol}
                </div>
                {item.name && item.name !== item.symbol && (
                  <div className="text-[7px] font-mono text-neutral/30 truncate">
                    {item.name}
                  </div>
                )}
              </div>

              {/* Price */}
              <span className="text-[10px] font-mono text-white text-right self-center">
                {q ? `$${fmtNum(q.price)}` : '--'}
              </span>

              {/* Change% */}
              <span
                className={`text-[9px] font-mono font-bold text-right self-center ${
                  isUp ? 'text-bullish' : 'text-bearish'
                }`}
              >
                {q
                  ? `${isUp ? '+' : ''}${fmtNum(q.changePercent)}%`
                  : '--'}
              </span>

              {/* Volume */}
              <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
                {q ? fmtVol(q.volume) : '--'}
              </span>

              {/* Market Cap */}
              <span className="text-[9px] font-mono text-neutral/50 text-right self-center">
                {q?.marketCap ? fmtVol(q.marketCap) : '--'}
              </span>

              {/* Day High / Low */}
              <div className="text-right self-center">
                {q && q.dayHigh != null && q.dayLow != null ? (
                  <div className="text-[8px] font-mono text-neutral/40 leading-tight">
                    <span className="text-bullish/70">
                      {fmtNum(q.dayHigh)}
                    </span>
                    <span className="text-neutral/20 mx-0.5">/</span>
                    <span className="text-bearish/70">
                      {fmtNum(q.dayLow)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[8px] font-mono text-neutral/30">
                    --
                  </span>
                )}
              </div>

              {/* 52W Range bar */}
              <div className="self-center">
                {q?.fiftyTwoWeekHigh != null &&
                q?.fiftyTwoWeekLow != null ? (
                  <div>
                    <RangeBar
                      pct={pctInRange(
                        q.price,
                        q.fiftyTwoWeekLow,
                        q.fiftyTwoWeekHigh,
                      )}
                    />
                    <div className="flex justify-between text-[6px] font-mono text-neutral/20 mt-0.5">
                      <span>{fmtNum(q.fiftyTwoWeekLow, 0)}</span>
                      <span>{fmtNum(q.fiftyTwoWeekHigh, 0)}</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[8px] font-mono text-neutral/30">
                    --
                  </span>
                )}
              </div>

              {/* Sparkline + remove */}
              <div className="flex items-center justify-end gap-1 self-center">
                {q && (
                  <Sparkline
                    data={miniTrend(
                      q.price,
                      q.changePercent,
                      q.dayHigh,
                      q.dayLow,
                      q.previousClose,
                    )}
                    width={36}
                    height={14}
                    color={isUp ? '#22c55e' : '#ef4444'}
                  />
                )}
                {user && (
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={(e) => handleRemove(e, item.symbol)}
                    className="opacity-0 group-hover:opacity-100 text-neutral/30 hover:text-bearish transition-all cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Status bar ── */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 flex items-center justify-between text-[8px] font-mono text-neutral/30">
        <span>
          {items?.length ?? 0} {t('scrResults')}
        </span>
        {items && items.length > 0 && (
          <span className="text-neutral/20">
            {t('refresh')}: 60s
          </span>
        )}
      </div>
    </div>
  );
}
