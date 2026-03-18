import { useState, useMemo } from 'react';
import { useFutures, type FutureData } from '../../api/hooks/use-futures';
import { useT } from '../../i18n';
import { useAppStore } from '../../stores/use-app-store';
import { Activity, RefreshCw, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';

type Category = 'all' | 'index' | 'treasury' | 'currency' | 'commodity' | 'volatility';
type SortKey = 'name' | 'price' | 'changePercent' | 'volume';

const CATEGORY_KEYS: Record<Category, string> = {
  all: 'fx_all',
  index: 'futIndex',
  treasury: 'futTreasury',
  currency: 'futCurrency',
  commodity: 'futCommodity',
  volatility: 'futVolatility',
};

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + 'M';
  if (vol >= 1_000) return (vol / 1_000).toFixed(1) + 'K';
  return String(vol);
}

function getHeatBg(changePercent: number): string {
  const abs = Math.abs(changePercent);
  if (abs < 0.1) return '';
  const intensity = Math.min(abs / 3, 1); // cap at 3% for max intensity
  if (changePercent > 0) {
    return `rgba(34, 197, 94, ${0.03 + intensity * 0.08})`;
  }
  return `rgba(239, 68, 68, ${0.03 + intensity * 0.08})`;
}

export function FuturesPanel() {
  const t = useT();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const { data: futures, isLoading, refetch } = useFutures();
  const [category, setCategory] = useState<Category>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name');
    }
  };

  const filtered = useMemo(() => {
    if (!futures) return [];
    return category === 'all' ? futures : futures.filter((f) => f.category === category);
  }, [futures, category]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'price') cmp = a.price - b.price;
      else if (sortKey === 'changePercent') cmp = a.changePercent - b.changePercent;
      else cmp = a.volume - b.volume;
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortAsc]);

  // Summary stats
  const summary = useMemo(() => {
    if (!futures || futures.length === 0) return null;
    const up = futures.filter((f) => f.changePercent > 0).length;
    const down = futures.filter((f) => f.changePercent < 0).length;
    const es = futures.find((f) => f.symbol === 'ES=F');
    const nq = futures.find((f) => f.symbol === 'NQ=F');
    return { up, down, es, nq };
  }, [futures]);

  // Implied open for index futures
  const impliedOpen = useMemo(() => {
    if (!futures) return null;
    const es = futures.find((f) => f.symbol === 'ES=F');
    if (!es || !es.underlyingPrice || !es.previousClose) return null;
    // Compare ES=F to S&P 500 previous close (underlyingPrice is current cash index)
    const spread = es.changePercent;
    return { direction: spread >= 0 ? 'up' : 'down', percent: spread };
  }, [futures]);

  const showVsCash = category === 'all' || category === 'index';

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {t('panelFutures')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-amber-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex items-center justify-between px-3 py-1 bg-[#080808] border-b border-border/20 shrink-0">
          <div className="flex items-center gap-3 text-[8px] font-mono">
            <span className="text-neutral/50">
              <TrendingUp className="w-2.5 h-2.5 inline text-bullish mr-0.5" />
              <span className="text-bullish">{summary.up}</span>
              <span className="text-neutral/30 mx-1">/</span>
              <TrendingDown className="w-2.5 h-2.5 inline text-bearish mr-0.5" />
              <span className="text-bearish">{summary.down}</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-[8px] font-mono font-bold">
            {summary.es && (
              <span className={summary.es.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}>
                ES {summary.es.changePercent >= 0 ? '+' : ''}{summary.es.changePercent.toFixed(2)}%
              </span>
            )}
            {summary.nq && (
              <span className={summary.nq.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}>
                NQ {summary.nq.changePercent >= 0 ? '+' : ''}{summary.nq.changePercent.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Implied open indicator */}
      {impliedOpen && (
        <div className="flex items-center justify-center px-3 py-1 bg-[#060606] border-b border-border/20 shrink-0">
          <span className="text-[8px] font-mono text-neutral/50 mr-1.5">
            {t('futImpliedOpen')}:
          </span>
          <span className={`text-[8px] font-mono font-bold ${
            impliedOpen.direction === 'up' ? 'text-bullish' : 'text-bearish'
          }`}>
            {impliedOpen.direction === 'up' ? '+' : ''}{impliedOpen.percent.toFixed(2)}%
          </span>
        </div>
      )}

      {/* Category tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['all', 'index', 'treasury', 'currency', 'commodity', 'volatility'] as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`flex-1 py-1.5 text-[7px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              category === cat
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(CATEGORY_KEYS[cat] as any)}
          </button>
        ))}
      </div>

      {/* Column headers */}
      <div className={`grid ${showVsCash ? 'grid-cols-[1.2fr_0.8fr_0.7fr_0.5fr_0.9fr_0.6fr_0.6fr]' : 'grid-cols-[1.2fr_0.8fr_0.7fr_0.5fr_0.9fr_0.6fr]'} px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider`}>
        <SortHeader label={t('eventDescription').split(' ')[0]} sortKey="name" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
        <SortHeader label={t('priceUsd').split(' ')[0]} sortKey="price" currentKey={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label={t('moversChange')} sortKey="changePercent" currentKey={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <span className="text-right">Chg%</span>
        <span className="text-right">{t('fxRange')}</span>
        <SortHeader label="Vol" sortKey="volume" currentKey={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        {showVsCash && <span className="text-right">{t('futVsCash')}</span>}
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !futures && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('futNoData')}
          </div>
        )}

        {sorted.map((f) => (
          <FutureRow
            key={f.symbol}
            future={f}
            showVsCash={showVsCash}
            onClick={() => setSelectedSymbol(f.symbol)}
          />
        ))}
      </div>
    </div>
  );
}

function FutureRow({ future: f, showVsCash, onClick }: { future: FutureData; showVsCash: boolean; onClick: () => void }) {
  const isPositive = f.changePercent >= 0;
  const decimals = f.category === 'currency' ? 5 : f.category === 'treasury' ? 4 : 2;

  return (
    <div
      onClick={onClick}
      className={`grid ${showVsCash ? 'grid-cols-[1.2fr_0.8fr_0.7fr_0.5fr_0.9fr_0.6fr_0.6fr]' : 'grid-cols-[1.2fr_0.8fr_0.7fr_0.5fr_0.9fr_0.6fr]'} px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.03] transition-colors cursor-pointer`}
      style={{ backgroundColor: getHeatBg(f.changePercent) }}
    >
      {/* Name */}
      <div className="flex flex-col justify-center min-w-0">
        <span className="text-[10px] font-mono font-bold text-white truncate">{f.name}</span>
        <span className="text-[7px] font-mono text-neutral/40">{f.symbol}</span>
      </div>

      {/* Price */}
      <span className="text-[10px] font-mono text-white text-right self-center">
        {f.price.toFixed(decimals)}
      </span>

      {/* Change */}
      <span className={`text-[10px] font-mono font-bold text-right self-center ${
        isPositive ? 'text-bullish' : 'text-bearish'
      }`}>
        {isPositive ? '+' : ''}{f.change.toFixed(decimals)}
      </span>

      {/* Change % */}
      <span className={`text-[9px] font-mono font-bold text-right self-center ${
        isPositive ? 'text-bullish' : 'text-bearish'
      }`}>
        {isPositive ? '+' : ''}{f.changePercent.toFixed(2)}%
      </span>

      {/* Day Range */}
      <div className="flex items-center justify-end gap-1 self-center">
        {f.dayLow != null && f.dayHigh != null ? (
          <>
            <span className="text-[7px] font-mono text-bearish/60">{f.dayLow.toFixed(decimals > 3 ? 4 : 2)}</span>
            <DayRangeBar low={f.dayLow} high={f.dayHigh} current={f.price} />
            <span className="text-[7px] font-mono text-bullish/60">{f.dayHigh.toFixed(decimals > 3 ? 4 : 2)}</span>
          </>
        ) : (
          <span className="text-[7px] font-mono text-neutral/20">--</span>
        )}
      </div>

      {/* Volume */}
      <span className="text-[9px] font-mono text-neutral/60 text-right self-center">
        {f.volume > 0 ? formatVolume(f.volume) : '--'}
      </span>

      {/* vs Cash (fair value spread) */}
      {showVsCash && (
        <span className={`text-[9px] font-mono text-right self-center ${
          f.fairValueSpread == null
            ? 'text-neutral/20'
            : f.fairValueSpread >= 0 ? 'text-bullish/70' : 'text-bearish/70'
        }`}>
          {f.fairValueSpread != null
            ? `${f.fairValueSpread >= 0 ? '+' : ''}${f.fairValueSpread.toFixed(2)}`
            : '--'}
        </span>
      )}
    </div>
  );
}

function DayRangeBar({ low, high, current }: { low: number; high: number; current: number }) {
  const range = high - low;
  const pct = range > 0 ? ((current - low) / range) * 100 : 50;

  return (
    <div className="w-8 h-1 bg-neutral/10 relative">
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white"
        style={{ left: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function SortHeader({ label, sortKey, currentKey, asc, onClick, className = '' }: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  asc: boolean;
  onClick: (key: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      onClick={() => onClick(sortKey)}
      className={`flex items-center gap-0.5 ${className} ${active ? 'text-amber-400' : ''}`}
    >
      <span>{label}</span>
      {active && <ArrowUpDown className="w-2 h-2" style={{ transform: asc ? 'none' : 'scaleY(-1)' }} />}
    </button>
  );
}
