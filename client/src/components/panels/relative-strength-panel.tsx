import { useState, useMemo } from 'react';
import { useRelativeStrength, type RSResult } from '../../api/hooks/use-relative-strength';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { Activity, RefreshCw } from 'lucide-react';

type SortKey = 'symbol' | 'rsRating' | 'rs1m' | 'rs3m' | 'rs6m' | 'rs12m' | 'changePercent';
type FilterMode = 'all' | 'strong' | 'weak';

export function RelativeStrengthPanel() {
  const t = useT();
  const { data: stocks, isLoading, refetch } = useRelativeStrength();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const [sortKey, setSortKey] = useState<SortKey>('rsRating');
  const [sortAsc, setSortAsc] = useState(false);
  const [filter, setFilter] = useState<FilterMode>('all');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'symbol'); }
  };

  const filtered = useMemo(() => {
    if (!stocks) return [];
    let result = [...stocks];
    if (filter === 'strong') result = result.filter(s => s.rsRating >= 70);
    if (filter === 'weak') result = result.filter(s => s.rsRating <= 30);
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'rsRating': cmp = a.rsRating - b.rsRating; break;
        case 'rs1m': cmp = a.rs1m - b.rs1m; break;
        case 'rs3m': cmp = a.rs3m - b.rs3m; break;
        case 'rs6m': cmp = a.rs6m - b.rs6m; break;
        case 'rs12m': cmp = a.rs12m - b.rs12m; break;
        case 'changePercent': cmp = a.changePercent - b.changePercent; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [stocks, filter, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {t('panelRelStrength')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-amber-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0">
        <div className="flex gap-1">
          {(['all', 'strong', 'weak'] as FilterMode[]).map((mode) => (
            <button key={mode} onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
                filter === mode
                  ? mode === 'strong' ? 'border-bullish/40 text-bullish bg-bullish/10'
                    : mode === 'weak' ? 'border-bearish/40 text-bearish bg-bearish/10'
                    : 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                  : 'border-border/20 text-neutral/30 hover:text-neutral/60'
              }`}>
              {t(`rs_${mode}`)}
            </button>
          ))}
        </div>
        <div className="text-[8px] font-mono text-neutral/40">
          {t('rsBenchmark')}: SPY
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider shrink-0">
        <SortHeader label={t('symbol')} k="symbol" current={sortKey} asc={sortAsc} onClick={handleSort} />
        <SortHeader label="RS" k="rsRating" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label="1M" k="rs1m" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label="3M" k="rs3m" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label="6M" k="rs6m" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label="12M" k="rs12m" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <SortHeader label={t('moversChange')} k="changePercent" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !stocks && (
          <div className="text-center py-8 text-amber-400 text-[9px] font-mono uppercase animate-pulse">
            {t('rsScanning')}
          </div>
        )}

        {filtered.map((s) => (
          <button
            key={s.symbol}
            onClick={() => setSelectedSymbol(s.symbol)}
            className="w-full grid grid-cols-[1fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-bold text-white truncate">{s.symbol}</div>
              <div className="text-[7px] font-mono text-neutral/30 truncate">${s.price.toFixed(2)}</div>
            </div>
            <div className="text-right self-center">
              <RatingBadge rating={s.rsRating} />
            </div>
            <RSCell value={s.rs1m} />
            <RSCell value={s.rs3m} />
            <RSCell value={s.rs6m} />
            <RSCell value={s.rs12m} />
            <span className={`text-[9px] font-mono font-bold text-right self-center ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
            </span>
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 text-[8px] font-mono text-neutral/30">
        {filtered.length} / {stocks?.length ?? 0} {t('rsStocks')}
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: number }) {
  const color = rating >= 80 ? 'text-emerald-400 bg-emerald-400/15'
    : rating >= 60 ? 'text-green-400 bg-green-400/10'
    : rating >= 40 ? 'text-neutral/60 bg-neutral/10'
    : rating >= 20 ? 'text-orange-400 bg-orange-400/10'
    : 'text-red-400 bg-red-400/15';
  return (
    <span className={`text-[9px] font-mono font-black px-1.5 py-0.5 ${color}`}>
      {rating}
    </span>
  );
}

function RSCell({ value }: { value: number }) {
  return (
    <span className={`text-[8px] font-mono text-right self-center ${value >= 0 ? 'text-bullish/70' : 'text-bearish/70'}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function SortHeader({ label, k, current, asc, onClick, className = '' }: {
  label: string; k: SortKey; current: SortKey; asc: boolean; onClick: (k: SortKey) => void; className?: string;
}) {
  const active = current === k;
  return (
    <button onClick={() => onClick(k)} className={`${className} ${active ? 'text-amber-400' : ''}`}>
      {label}{active ? (asc ? ' ↑' : ' ↓') : ''}
    </button>
  );
}
