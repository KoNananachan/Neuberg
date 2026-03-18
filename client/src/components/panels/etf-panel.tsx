import { useState, useMemo, useCallback } from 'react';
import { useETF, type ETFData } from '../../api/hooks/use-etf';
import { useT } from '../../i18n';
import { useAppStore } from '../../stores/use-app-store';
import { Layers, RefreshCw, Search, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';

type CategoryFilter = 'all' | 'us_equity' | 'international' | 'sector' | 'fixed_income' | 'commodity' | 'thematic' | 'volatility';

const CATEGORIES: CategoryFilter[] = [
  'all', 'us_equity', 'international', 'sector', 'fixed_income', 'commodity', 'thematic', 'volatility',
];

const CATEGORY_KEYS: Record<CategoryFilter, string> = {
  all: 'etfCategory_all',
  us_equity: 'etfCategory_us_equity',
  international: 'etfCategory_international',
  sector: 'etfCategory_sector',
  fixed_income: 'etfCategory_fixed_income',
  commodity: 'etfCategory_commodity',
  thematic: 'etfCategory_thematic',
  volatility: 'etfCategory_volatility',
};

type SortField = 'symbol' | 'name' | 'price' | 'changePercent' | 'volume' | 'avgVolume';
type SortDir = 'asc' | 'desc';

export function ETFPanel() {
  const t = useT();
  const { data: etfs, isLoading, refetch } = useETF();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'symbol' || field === 'name' ? 'asc' : 'desc');
    }
  }, [sortField]);

  const filtered = useMemo(() => {
    if (!etfs) return [];
    let list = etfs;
    if (category !== 'all') {
      list = list.filter((e) => e.category === category);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (e) => e.symbol.toLowerCase().includes(q) || e.name.toLowerCase().includes(q),
      );
    }
    // Sort
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [etfs, category, search, sortField, sortDir]);

  const totalCount = etfs?.length ?? 0;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-cyan-400">
            {t('panelETF')}
          </span>
        </div>
        <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-cyan-400 transition-colors">
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-border/30 bg-black/40 shrink-0 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 px-2 py-1.5 text-[7px] font-black uppercase tracking-widest border-b-2 transition-colors whitespace-nowrap ${
              category === cat
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-neutral/40 hover:text-neutral'
            }`}
          >
            {t(CATEGORY_KEYS[cat] as any)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-3 py-1.5 border-b border-border/20 shrink-0">
        <div className="flex items-center gap-1.5 bg-white/[0.03] border border-border/20 rounded px-2 py-1">
          <Search className="w-3 h-3 text-neutral/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('etfSearch')}
            className="flex-1 bg-transparent text-[9px] font-mono text-white placeholder-neutral/30 outline-none"
          />
        </div>
      </div>

      {/* Column header */}
      <div className="grid grid-cols-[0.7fr_1.3fr_0.7fr_0.6fr_0.7fr_0.7fr] px-3 py-1 border-b border-border/20 shrink-0">
        <SortableHeader field="symbol" label="Symbol" current={sortField} dir={sortDir} onSort={handleSort} />
        <SortableHeader field="name" label="Name" current={sortField} dir={sortDir} onSort={handleSort} />
        <SortableHeader field="price" label="Price" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
        <SortableHeader field="changePercent" label="Chg%" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
        <SortableHeader field="volume" label="Volume" current={sortField} dir={sortDir} onSort={handleSort} align="right" />
        <SortableHeader field="avgVolume" label={t('etfAvgVol')} current={sortField} dir={sortDir} onSort={handleSort} align="right" />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !etfs && (
          <div className="text-center py-8 text-cyan-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-8 text-neutral/30 text-[9px] font-mono uppercase">
            {t('noResults')}
          </div>
        )}

        {filtered.map((etf) => (
          <ETFRow key={etf.symbol} etf={etf} onClick={() => setSelectedSymbol(etf.symbol)} />
        ))}
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-border/30 bg-[#050505] shrink-0 flex items-center gap-3 text-[8px] font-mono">
        <span className="text-neutral/40">
          {filtered.length}/{totalCount} {t('etfResults')}
        </span>
        {etfs && etfs.length > 0 && (
          <>
            <span className="text-bullish">
              {etfs.filter((e) => e.changePercent > 0).length} up
            </span>
            <span className="text-bearish">
              {etfs.filter((e) => e.changePercent < 0).length} down
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function SortableHeader({
  field,
  label,
  current,
  dir,
  onSort,
  align = 'left',
}: {
  field: SortField;
  label: string;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-[7px] font-black uppercase tracking-wider transition-colors ${
        align === 'right' ? 'justify-end' : ''
      } ${isActive ? 'text-cyan-400' : 'text-neutral/40 hover:text-neutral/60'}`}
    >
      {label}
      {isActive ? (
        dir === 'asc' ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />
      ) : (
        <ArrowUpDown className="w-2 h-2 opacity-30" />
      )}
    </button>
  );
}

function ETFRow({ etf, onClick }: { etf: ETFData; onClick: () => void }) {
  const isPositive = etf.changePercent >= 0;
  const pctAbs = Math.abs(etf.changePercent);
  const heat = Math.min(pctAbs / 3, 1);

  const volRatio = etf.avgVolume && etf.avgVolume > 0 ? etf.volume / etf.avgVolume : null;

  return (
    <div
      onClick={onClick}
      className="grid grid-cols-[0.7fr_1.3fr_0.7fr_0.6fr_0.7fr_0.7fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.03] transition-colors cursor-pointer relative"
    >
      {/* Heat background */}
      <div
        className={`absolute inset-0 ${isPositive ? 'bg-bullish' : 'bg-bearish'}`}
        style={{ opacity: heat * 0.06 }}
      />

      {/* Symbol */}
      <span className="text-[10px] font-mono font-bold text-white relative z-10 self-center">
        {etf.symbol}
      </span>

      {/* Name (truncated) */}
      <span className="text-[9px] font-mono text-neutral/50 relative z-10 self-center truncate pr-2">
        {etf.name}
      </span>

      {/* Price */}
      <span className="text-[10px] font-mono text-white text-right relative z-10 self-center">
        {fmtPrice(etf.price)}
      </span>

      {/* Change% */}
      <span className={`text-[10px] font-mono font-bold text-right relative z-10 self-center ${
        isPositive ? 'text-bullish' : 'text-bearish'
      }`}>
        {isPositive ? '+' : ''}{etf.changePercent.toFixed(2)}%
      </span>

      {/* Volume */}
      <span className="text-[9px] font-mono text-neutral/50 text-right relative z-10 self-center">
        {fmtVolume(etf.volume)}
      </span>

      {/* Avg Vol with ratio indicator */}
      <div className="flex items-center justify-end gap-1 relative z-10 self-center">
        <span className="text-[9px] font-mono text-neutral/40">
          {etf.avgVolume ? fmtVolume(etf.avgVolume) : '-'}
        </span>
        {volRatio != null && (
          <span className={`text-[7px] font-mono font-bold ${
            volRatio > 1.5 ? 'text-yellow-400' : volRatio > 1 ? 'text-neutral/40' : 'text-neutral/25'
          }`}>
            {volRatio.toFixed(1)}x
          </span>
        )}
      </div>
    </div>
  );
}

function fmtPrice(n: number): string {
  if (n >= 1000) return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(4);
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return String(n);
}
