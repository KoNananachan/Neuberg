import { useState, useMemo, useCallback } from 'react';
import { useIvRank, type IvRankEntry, type IvRankResponse } from '../../api/hooks/use-iv-rank';
import { useT } from '../../i18n';
import { RefreshCw, Activity } from 'lucide-react';

// ── i18n helper with fallback ──

function useTr() {
  const t = useT();
  return useCallback(
    (key: string, fallback: string): string => {
      try {
        return (t as (k: string) => string)(key) || fallback;
      } catch {
        return fallback;
      }
    },
    [t],
  );
}

// ── Constants ──

const ACCENT = '#8b5cf6'; // violet-400
type ViewMode = 'TABLE' | 'HEATMAP';
type SortField =
  | 'symbol'
  | 'currentIv'
  | 'ivRank'
  | 'ivPercentile'
  | 'hvCurrent'
  | 'ivHvSpread'
  | 'skew'
  | 'termStructure'
  | 'putCallRatio'
  | 'signal';

const SECTORS = ['ALL', 'INDEX', 'TECHNOLOGY', 'CONSUMER', 'ENERGY', 'FINANCE', 'HEALTHCARE', 'COMMODITIES'] as const;
type SectorFilter = (typeof SECTORS)[number];

// ── Color helpers ──

function ivRankColor(rank: number): string {
  if (rank >= 80) return 'text-red-400';
  if (rank >= 60) return 'text-orange-400';
  if (rank >= 40) return 'text-yellow-400';
  if (rank >= 20) return 'text-emerald-400';
  return 'text-green-400';
}

function ivRankBarGradient(rank: number): string {
  if (rank >= 80) return '#ef4444';
  if (rank >= 60) return '#f97316';
  if (rank >= 40) return '#eab308';
  if (rank >= 20) return '#22c55e';
  return '#16a34a';
}

function ivRankHeatColor(rank: number): string {
  // green (low) -> yellow (mid) -> red (high)
  if (rank <= 20) return 'rgba(22,163,74,0.7)';
  if (rank <= 40) return 'rgba(34,197,94,0.5)';
  if (rank <= 60) return 'rgba(234,179,8,0.5)';
  if (rank <= 80) return 'rgba(249,115,22,0.6)';
  return 'rgba(239,68,68,0.7)';
}

function spreadColor(spread: number): string {
  return spread >= 0 ? 'text-emerald-400' : 'text-red-400';
}

function signalBadge(signal: string | null): { text: string; cls: string } | null {
  if (!signal) return null;
  switch (signal) {
    case 'CHEAP_VOL':
      return { text: 'CHEAP', cls: 'bg-green-500/15 text-green-400 border-green-500/30' };
    case 'RICH_VOL':
      return { text: 'RICH', cls: 'bg-red-500/15 text-red-400 border-red-500/30' };
    case 'IV_CRUSH':
      return { text: 'CRUSH', cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30' };
    case 'IV_EXPANSION':
      return { text: 'EXPAND', cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30' };
    default:
      return null;
  }
}

function termBadge(term: string): { text: string; cls: string } {
  switch (term) {
    case 'contango':
      return { text: 'CONTANGO', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    case 'backwardation':
      return { text: 'BACKWRD', cls: 'bg-red-500/10 text-red-400 border-red-500/20' };
    default:
      return { text: 'FLAT', cls: 'bg-white/5 text-neutral-400 border-white/10' };
  }
}

// ── Sparkline SVG ──

function Sparkline({ data, width = 48, height = 16 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 2) - 1;
      return `${x},${y}`;
    })
    .join(' ');

  const lastVal = data[data.length - 1];
  const firstVal = data[0];
  const color = lastVal >= firstVal ? '#8b5cf6' : '#ef4444';

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="inline-block">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.2} opacity={0.8} />
    </svg>
  );
}

// ── Main Panel ──

export function IvRankPanel() {
  const tr = useTr();
  const { data, isLoading, refetch } = useIvRank();
  const [view, setView] = useState<ViewMode>('TABLE');
  const [sector, setSector] = useState<SectorFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('ivRank');
  const [sortAsc, setSortAsc] = useState(false);

  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortAsc((p) => !p);
      } else {
        setSortField(field);
        setSortAsc(false);
      }
    },
    [sortField],
  );

  const filtered = useMemo(() => {
    if (!data) return [];
    let entries = data.entries;
    if (sector !== 'ALL') {
      const s = sector.charAt(0) + sector.slice(1).toLowerCase();
      entries = entries.filter((e) => e.sector === s);
    }
    const sorted = [...entries].sort((a, b) => {
      let av: number | string = 0;
      let bv: number | string = 0;
      switch (sortField) {
        case 'symbol':
          av = a.symbol;
          bv = b.symbol;
          break;
        case 'currentIv':
          av = a.currentIv;
          bv = b.currentIv;
          break;
        case 'ivRank':
          av = a.ivRank;
          bv = b.ivRank;
          break;
        case 'ivPercentile':
          av = a.ivPercentile;
          bv = b.ivPercentile;
          break;
        case 'hvCurrent':
          av = a.hvCurrent;
          bv = b.hvCurrent;
          break;
        case 'ivHvSpread':
          av = a.ivHvSpread;
          bv = b.ivHvSpread;
          break;
        case 'skew':
          av = a.skew;
          bv = b.skew;
          break;
        case 'termStructure':
          av = a.termStructure;
          bv = b.termStructure;
          break;
        case 'putCallRatio':
          av = a.putCallRatio;
          bv = b.putCallRatio;
          break;
        case 'signal':
          av = a.signal ?? '';
          bv = b.signal ?? '';
          break;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return sorted;
  }, [data, sector, sortField, sortAsc]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-violet-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-violet-400">
            {tr('panelIvRank', 'IV RANK / PERCENTILE')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* VIX badge */}
          {data && (
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/20">
              <span className="text-[7px] font-mono font-bold text-violet-300 uppercase tracking-wider">VIX</span>
              <span className="text-[9px] font-mono font-black text-white">
                {data.marketIv.toFixed(2)}
              </span>
              <span
                className={`text-[8px] font-mono font-bold ${
                  data.marketIvChange >= 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {data.marketIvChange >= 0 ? '+' : ''}
                {data.marketIvChange.toFixed(2)}
              </span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            className="p-1 text-neutral-500 hover:text-violet-400 transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Controls: view toggle + sector filter */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#030303] border-b border-border/20 shrink-0 gap-2">
        {/* View toggle */}
        <div className="flex">
          {(['TABLE', 'HEATMAP'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-2 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider border transition-colors ${
                view === v
                  ? 'text-violet-400 bg-violet-500/10 border-violet-500/30'
                  : 'text-neutral-500 bg-transparent border-border/20 hover:text-neutral-300'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Sector filter */}
        <div className="flex gap-0.5 overflow-x-auto no-scrollbar">
          {SECTORS.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`px-1.5 py-0.5 text-[7px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
                sector === s
                  ? 'text-violet-400 bg-violet-500/10'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {isLoading && !data && (
          <div className="text-center py-8 text-violet-400 text-[9px] font-mono uppercase animate-pulse">
            {tr('loading', 'Loading...')}
          </div>
        )}

        {!data && !isLoading && (
          <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
            {tr('ivRankNoData', 'No IV data available')}
          </div>
        )}

        {data && view === 'TABLE' && (
          <TableView
            entries={filtered}
            sortField={sortField}
            sortAsc={sortAsc}
            onSort={handleSort}
            tr={tr}
          />
        )}

        {data && view === 'HEATMAP' && (
          <HeatmapView entries={filtered} tr={tr} />
        )}
      </div>
    </div>
  );
}

// ── Sortable column header ──

function SortHeader({
  label,
  field,
  current,
  asc,
  onSort,
  className = '',
}: {
  label: string;
  field: SortField;
  current: SortField;
  asc: boolean;
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`text-[7px] font-black font-mono uppercase tracking-wider text-left cursor-pointer select-none transition-colors ${
        isActive ? 'text-violet-400' : 'text-neutral-500'
      } hover:text-violet-300 ${className}`}
    >
      {label}
      {isActive && <span className="ml-0.5">{asc ? '\u25B2' : '\u25BC'}</span>}
    </button>
  );
}

// ── Table View ──

function TableView({
  entries,
  sortField,
  sortAsc,
  onSort,
  tr,
}: {
  entries: IvRankEntry[];
  sortField: SortField;
  sortAsc: boolean;
  onSort: (f: SortField) => void;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <div className="min-w-[800px]">
      {/* Header row */}
      <div className="grid grid-cols-[minmax(80px,1fr)_60px_70px_70px_90px_50px_55px_50px_60px_45px_52px_52px] px-2 py-1 border-b border-border/20 sticky top-0 bg-black z-10">
        <SortHeader label={tr('ivRankSymbol', 'Symbol')} field="symbol" current={sortField} asc={sortAsc} onSort={onSort} />
        <SortHeader label="IV" field="currentIv" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label={tr('ivRankRank', 'IV RANK')} field="ivRank" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label={tr('ivRankPctile', 'IV %ILE')} field="ivPercentile" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
          {tr('ivRank52W', '52W RANGE')}
        </span>
        <SortHeader label="HV" field="hvCurrent" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label="IV-HV" field="ivHvSpread" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label={tr('ivRankSkew', 'SKEW')} field="skew" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label={tr('ivRankTerm', 'TERM')} field="termStructure" current={sortField} asc={sortAsc} onSort={onSort} className="text-center" />
        <SortHeader label="P/C" field="putCallRatio" current={sortField} asc={sortAsc} onSort={onSort} className="text-right" />
        <SortHeader label={tr('ivRankSignal', 'SIGNAL')} field="signal" current={sortField} asc={sortAsc} onSort={onSort} className="text-center" />
        <span className="text-[7px] font-black font-mono uppercase tracking-wider text-neutral-500 text-center">
          {tr('ivRankSpark', 'SPARK')}
        </span>
      </div>

      {/* Rows */}
      {entries.map((e) => (
        <TableRow key={e.symbol} entry={e} />
      ))}

      {entries.length === 0 && (
        <div className="text-center py-6 text-neutral-500 text-[9px] font-mono uppercase">
          {tr('ivRankNoResults', 'No entries match filter')}
        </div>
      )}
    </div>
  );
}

// ── Table Row ──

function TableRow({ entry: e }: { entry: IvRankEntry }) {
  const sig = signalBadge(e.signal);
  const term = termBadge(e.termStructure);

  // 52-week range position
  const range52 = e.iv52High - e.iv52Low;
  const pos52 = range52 > 0 ? ((e.currentIv - e.iv52Low) / range52) * 100 : 50;

  return (
    <div className="grid grid-cols-[minmax(80px,1fr)_60px_70px_70px_90px_50px_55px_50px_60px_45px_52px_52px] px-2 py-1 border-b border-border/10 hover:bg-violet-400/[0.02] transition-colors items-center">
      {/* Symbol + Name */}
      <div className="min-w-0">
        <div className="text-[9px] font-mono font-bold text-white truncate">{e.symbol}</div>
        <div className="text-[7px] font-mono text-neutral-500 truncate">{e.name}</div>
      </div>

      {/* IV */}
      <div className={`text-[9px] font-mono font-bold text-right ${ivRankColor(e.ivRank)}`}>
        {(e.currentIv * 100).toFixed(1)}%
      </div>

      {/* IV Rank */}
      <div className="text-right pr-1">
        <div className="flex items-center justify-end gap-1">
          <div className="w-8 h-[5px] bg-white/[0.04] overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${e.ivRank}%`,
                backgroundColor: ivRankBarGradient(e.ivRank),
              }}
            />
          </div>
          <span className={`text-[9px] font-mono font-black ${ivRankColor(e.ivRank)}`}>
            {e.ivRank}
          </span>
        </div>
      </div>

      {/* IV Percentile */}
      <div className="text-right pr-1">
        <div className="flex items-center justify-end gap-1">
          <div className="w-8 h-[5px] bg-white/[0.04] overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${e.ivPercentile}%`,
                backgroundColor: ivRankBarGradient(e.ivPercentile),
              }}
            />
          </div>
          <span className={`text-[9px] font-mono font-black ${ivRankColor(e.ivPercentile)}`}>
            {e.ivPercentile}
          </span>
        </div>
      </div>

      {/* 52W Range */}
      <div className="flex items-center gap-1 px-1">
        <span className="text-[7px] font-mono text-neutral-600">
          {(e.iv52Low * 100).toFixed(0)}
        </span>
        <div className="flex-1 h-[5px] bg-white/[0.04] relative">
          <div
            className="absolute top-0 h-full w-[3px] bg-violet-400"
            style={{ left: `calc(${Math.min(Math.max(pos52, 2), 98)}% - 1.5px)` }}
          />
        </div>
        <span className="text-[7px] font-mono text-neutral-600">
          {(e.iv52High * 100).toFixed(0)}
        </span>
      </div>

      {/* HV */}
      <div className="text-[9px] font-mono text-neutral-400 text-right">
        {(e.hvCurrent * 100).toFixed(1)}%
      </div>

      {/* IV-HV Spread */}
      <div className={`text-[9px] font-mono font-bold text-right ${spreadColor(e.ivHvSpread)}`}>
        {e.ivHvSpread >= 0 ? '+' : ''}
        {(e.ivHvSpread * 100).toFixed(1)}
      </div>

      {/* Skew */}
      <div className="text-[9px] font-mono text-neutral-400 text-right">
        {e.skew.toFixed(2)}
      </div>

      {/* Term Structure */}
      <div className="flex justify-center">
        <span
          className={`px-1 py-0 text-[6px] font-mono font-bold uppercase tracking-wider border ${term.cls}`}
        >
          {term.text}
        </span>
      </div>

      {/* P/C Ratio */}
      <div className="text-[9px] font-mono text-neutral-400 text-right">
        {e.putCallRatio.toFixed(2)}
      </div>

      {/* Signal */}
      <div className="flex justify-center">
        {sig ? (
          <span
            className={`px-1 py-0 text-[6px] font-mono font-bold uppercase tracking-wider border ${sig.cls}`}
          >
            {sig.text}
          </span>
        ) : (
          <span className="text-[7px] font-mono text-neutral-600">--</span>
        )}
      </div>

      {/* Sparkline */}
      <div className="flex justify-center">
        <Sparkline data={e.ivHistory} />
      </div>
    </div>
  );
}

// ── Heatmap View ──

function HeatmapView({
  entries,
  tr,
}: {
  entries: IvRankEntry[];
  tr: (key: string, fallback: string) => string;
}) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-neutral-500 text-[9px] font-mono uppercase">
        {tr('ivRankNoResults', 'No entries match filter')}
      </div>
    );
  }

  // Determine grid layout: index/major names get bigger boxes
  const MAJOR_SYMBOLS = new Set(['SPY', 'QQQ', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT', 'META', 'GOOGL']);

  return (
    <div className="p-2">
      <div className="flex flex-wrap gap-[2px]">
        {entries.map((e) => {
          const isMajor = MAJOR_SYMBOLS.has(e.symbol);
          return (
            <div
              key={e.symbol}
              className="flex flex-col items-center justify-center border border-white/5 transition-colors hover:border-violet-400/30"
              style={{
                width: isMajor ? 80 : 64,
                height: isMajor ? 56 : 44,
                backgroundColor: ivRankHeatColor(e.ivRank),
              }}
            >
              <span className="text-[9px] font-mono font-black text-white leading-none">
                {e.symbol}
              </span>
              <span className="text-[11px] font-mono font-black text-white leading-tight">
                {e.ivRank}
              </span>
              <span className="text-[7px] font-mono text-white/60 leading-none">
                {(e.currentIv * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-1 mt-3">
        <span className="text-[7px] font-mono text-neutral-500">
          {tr('ivRankLow', 'Low IV Rank')}
        </span>
        <div className="flex">
          {[0, 25, 50, 75, 100].map((r) => (
            <div
              key={r}
              className="w-6 h-2"
              style={{ backgroundColor: ivRankHeatColor(r) }}
            />
          ))}
        </div>
        <span className="text-[7px] font-mono text-neutral-500">
          {tr('ivRankHigh', 'High IV Rank')}
        </span>
      </div>
    </div>
  );
}
