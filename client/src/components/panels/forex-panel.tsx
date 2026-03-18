import { useState } from 'react';
import { useForexRates, type FxPair } from '../../api/hooks/use-forex';
import { useT } from '../../i18n';
import { DollarSign, RefreshCw, ArrowUpDown } from 'lucide-react';

type SortKey = 'pair' | 'rate' | 'changePercent';

// Base currency groupings
const MAJORS = new Set(['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CHF', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'DXY']);
const CROSSES = new Set(['EUR/GBP', 'EUR/JPY', 'GBP/JPY', 'EUR/CHF', 'AUD/JPY']);

type FilterMode = 'all' | 'majors' | 'crosses' | 'em';

export function ForexPanel() {
  const t = useT();
  const { data: pairs, isLoading, refetch } = useForexRates();
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pair');
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'pair');
    }
  };

  const filtered = (pairs ?? []).filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'majors') return MAJORS.has(p.pair);
    if (filter === 'crosses') return CROSSES.has(p.pair);
    return !MAJORS.has(p.pair) && !CROSSES.has(p.pair); // emerging markets
  });

  const sorted = filtered.slice().sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'pair') cmp = a.pair.localeCompare(b.pair);
    else if (sortKey === 'rate') cmp = a.rate - b.rate;
    else cmp = a.changePercent - b.changePercent;
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('panelForex')}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0">
        {(['all', 'majors', 'crosses', 'em'] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilter(mode)}
            className={`flex-1 py-1.5 text-[8px] font-black uppercase tracking-widest border-b-2 transition-colors ${
              filter === mode
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(`fx_${mode}`)}
          </button>
        ))}
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[1fr_1fr_0.7fr_1fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider">
        <SortHeader label={t('fxPair')} sortKey="pair" currentKey={sortKey} asc={sortAsc} onClick={handleSort} />
        <SortHeader label={t('fxRate')} sortKey="rate" currentKey={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label={t('moversChange')} sortKey="changePercent" currentKey={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <span className="text-right">{t('fxRange')}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !pairs && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && sorted.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('noData')}
          </div>
        )}

        {sorted.map((p) => (
          <FxRow key={p.symbol} pair={p} />
        ))}
      </div>
    </div>
  );
}

function FxRow({ pair: p }: { pair: FxPair }) {
  const isPositive = p.changePercent >= 0;
  // Determine decimal places based on pair
  const decimals = p.pair === 'USD/JPY' || p.pair.endsWith('/JPY') ? 3
    : p.pair === 'DXY' ? 3
    : 5;

  return (
    <div className="grid grid-cols-[1fr_1fr_0.7fr_1fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] font-mono font-bold text-white">{p.pair}</span>
      </div>
      <span className="text-[10px] font-mono text-white text-right self-center">
        {p.rate.toFixed(decimals)}
      </span>
      <span className={`text-[10px] font-mono font-bold text-right self-center ${
        isPositive ? 'text-bullish' : 'text-bearish'
      }`}>
        {isPositive ? '+' : ''}{p.changePercent.toFixed(2)}%
      </span>
      <div className="flex items-center justify-end gap-1 self-center">
        {p.dayLow != null && p.dayHigh != null && (
          <>
            <span className="text-[7px] font-mono text-bearish/60">{p.dayLow.toFixed(decimals > 3 ? 4 : 2)}</span>
            <DayRangeBar low={p.dayLow} high={p.dayHigh} current={p.rate} />
            <span className="text-[7px] font-mono text-bullish/60">{p.dayHigh.toFixed(decimals > 3 ? 4 : 2)}</span>
          </>
        )}
      </div>
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
      className={`flex items-center gap-0.5 ${className} ${active ? 'text-cyan-400' : ''}`}
    >
      <span>{label}</span>
      {active && <ArrowUpDown className="w-2 h-2" style={{ transform: asc ? 'none' : 'scaleY(-1)' }} />}
    </button>
  );
}
