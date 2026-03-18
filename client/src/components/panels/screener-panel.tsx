import { useState, useMemo } from 'react';
import { useScreener, type ScreenResult } from '../../api/hooks/use-screener';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { Filter, RefreshCw, ArrowUpDown } from 'lucide-react';

type SortKey = 'symbol' | 'price' | 'changePercent' | 'volume' | 'marketCap' | 'pe';

interface Filters {
  minMcap: string;
  maxPE: string;
  minChange: string;
  maxChange: string;
  minVolume: string;
}

export function ScreenerPanel() {
  const t = useT();
  const { data: stocks, isLoading, refetch } = useScreener();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);
  const [sortKey, setSortKey] = useState<SortKey>('marketCap');
  const [sortAsc, setSortAsc] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    minMcap: '', maxPE: '', minChange: '', maxChange: '', minVolume: '',
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'symbol'); }
  };

  const filtered = useMemo(() => {
    if (!stocks) return [];
    let result = [...stocks];

    // Apply filters
    const minMcap = parseFloat(filters.minMcap);
    if (!isNaN(minMcap)) result = result.filter((s) => (s.marketCap ?? 0) >= minMcap * 1e9);

    const maxPE = parseFloat(filters.maxPE);
    if (!isNaN(maxPE)) result = result.filter((s) => s.pe != null && s.pe <= maxPE && s.pe > 0);

    const minChange = parseFloat(filters.minChange);
    if (!isNaN(minChange)) result = result.filter((s) => s.changePercent >= minChange);

    const maxChange = parseFloat(filters.maxChange);
    if (!isNaN(maxChange)) result = result.filter((s) => s.changePercent <= maxChange);

    const minVol = parseFloat(filters.minVolume);
    if (!isNaN(minVol)) result = result.filter((s) => s.volume >= minVol * 1e6);

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'price': cmp = a.price - b.price; break;
        case 'changePercent': cmp = a.changePercent - b.changePercent; break;
        case 'volume': cmp = a.volume - b.volume; break;
        case 'marketCap': cmp = (a.marketCap ?? 0) - (b.marketCap ?? 0); break;
        case 'pe': cmp = (a.pe ?? 999) - (b.pe ?? 999); break;
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [stocks, filters, sortKey, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-teal-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-teal-400">
            {t('panelScreener')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1 transition-colors ${showFilters ? 'text-teal-400' : 'text-neutral/40 hover:text-teal-400'}`}
          >
            <Filter className="w-3 h-3" />
          </button>
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-teal-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter inputs */}
      {showFilters && (
        <div className="px-3 py-2 border-b border-border/20 bg-black/60 shrink-0 grid grid-cols-5 gap-1.5">
          <FilterInput label={t('scrMcap')} value={filters.minMcap} placeholder="50"
            onChange={(v) => setFilters({ ...filters, minMcap: v })} suffix="B+" />
          <FilterInput label={t('scrPE')} value={filters.maxPE} placeholder="30"
            onChange={(v) => setFilters({ ...filters, maxPE: v })} suffix="max" />
          <FilterInput label={t('scrChgMin')} value={filters.minChange} placeholder="-5"
            onChange={(v) => setFilters({ ...filters, minChange: v })} suffix="%" />
          <FilterInput label={t('scrChgMax')} value={filters.maxChange} placeholder="10"
            onChange={(v) => setFilters({ ...filters, maxChange: v })} suffix="%" />
          <FilterInput label={t('scrVol')} value={filters.minVolume} placeholder="1"
            onChange={(v) => setFilters({ ...filters, minVolume: v })} suffix="M+" />
        </div>
      )}

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.7fr_0.6fr_0.7fr_0.7fr_0.5fr] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider shrink-0">
        <ColHeader label={t('symbol')} sortKey="symbol" current={sortKey} asc={sortAsc} onClick={handleSort} />
        <ColHeader label={t('price')} sortKey="price" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <ColHeader label={t('moversChange')} sortKey="changePercent" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <ColHeader label={t('moversVolume')} sortKey="volume" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <ColHeader label={t('scrMcap')} sortKey="marketCap" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
        <ColHeader label="P/E" sortKey="pe" current={sortKey} asc={sortAsc} onClick={handleSort} className="text-right" />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !stocks && (
          <div className="text-center py-8 text-teal-400 text-[9px] font-mono uppercase animate-pulse">
            {t('loading')}
          </div>
        )}

        {filtered.map((s) => (
          <button
            key={s.symbol}
            onClick={() => setSelectedSymbol(s.symbol)}
            className="w-full grid grid-cols-[1fr_0.7fr_0.6fr_0.7fr_0.7fr_0.5fr] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors text-left"
          >
            <div className="min-w-0">
              <div className="text-[10px] font-mono font-bold text-white truncate">{s.symbol}</div>
              <div className="text-[7px] font-mono text-neutral/30 truncate">{s.name}</div>
            </div>
            <span className="text-[10px] font-mono text-white text-right self-center">${s.price.toFixed(2)}</span>
            <span className={`text-[9px] font-mono font-bold text-right self-center ${s.changePercent >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {s.changePercent >= 0 ? '+' : ''}{s.changePercent.toFixed(2)}%
            </span>
            <span className="text-[9px] font-mono text-neutral/50 text-right self-center">{fmtVol(s.volume)}</span>
            <span className="text-[9px] font-mono text-neutral/50 text-right self-center">{s.marketCap ? fmtMcap(s.marketCap) : '—'}</span>
            <span className="text-[9px] font-mono text-neutral/50 text-right self-center">{s.pe != null && s.pe > 0 ? s.pe.toFixed(1) : '—'}</span>
          </button>
        ))}
      </div>

      {/* Status */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0 text-[8px] font-mono text-neutral/30">
        {filtered.length} / {stocks?.length ?? 0} {t('scrResults')}
      </div>
    </div>
  );
}

function FilterInput({ label, value, placeholder, onChange, suffix }: {
  label: string; value: string; placeholder: string; onChange: (v: string) => void; suffix: string;
}) {
  return (
    <div>
      <div className="text-[7px] font-mono text-neutral/40 mb-0.5">{label}</div>
      <div className="flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-black border border-border/30 px-1.5 py-0.5 text-[9px] font-mono text-white placeholder:text-neutral/20"
        />
        <span className="text-[7px] font-mono text-neutral/30 ml-0.5 shrink-0">{suffix}</span>
      </div>
    </div>
  );
}

function ColHeader({ label, sortKey, current, asc, onClick, className = '' }: {
  label: string; sortKey: SortKey; current: SortKey; asc: boolean; onClick: (k: SortKey) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <button onClick={() => onClick(sortKey)} className={`flex items-center gap-0.5 ${className} ${active ? 'text-teal-400' : ''}`}>
      <span>{label}</span>
      {active && <ArrowUpDown className="w-2 h-2" style={{ transform: asc ? 'none' : 'scaleY(-1)' }} />}
    </button>
  );
}

function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(0);
}

function fmtMcap(n: number): string {
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(1) + 'T';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(0) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(0) + 'M';
  return '$' + n.toFixed(0);
}
