import { useState, useMemo, useCallback } from 'react';
import {
  useConfluence,
  type ConfluenceResult,
  type ConfluenceSignal,
  type SignalDirection,
} from '../../api/hooks/use-confluence';
import { useAppStore } from '../../stores/use-app-store';
import { useT } from '../../i18n';
import { Crosshair, RefreshCw, Grid3X3, List, ChevronDown, ChevronUp } from 'lucide-react';

// ── Constants ──

type FilterMode = 'all' | 'bullish' | 'bearish';
type SortKey = 'symbol' | 'score' | 'changePct' | 'bullish' | 'bearish';
type ViewMode = 'table' | 'heatmap';

type SignalKey = 'smaCross' | 'emaCross' | 'rsi' | 'macd' | 'bollingerBands' | 'volume' | 'priceSma200' | 'stochastic';

const SIGNAL_KEYS: SignalKey[] = [
  'smaCross', 'emaCross', 'rsi', 'macd', 'bollingerBands', 'volume', 'priceSma200', 'stochastic',
];

const SIGNAL_SHORT_LABELS: Record<SignalKey, string> = {
  smaCross: 'SMA',
  emaCross: 'EMA',
  rsi: 'RSI',
  macd: 'MACD',
  bollingerBands: 'BB',
  volume: 'VOL',
  priceSma200: '200D',
  stochastic: 'STCH',
};

const SIGNAL_FULL_LABELS: Record<SignalKey, string> = {
  smaCross: 'SMA 20/50 Cross',
  emaCross: 'EMA 12/26 Cross',
  rsi: 'RSI (14)',
  macd: 'MACD Signal',
  bollingerBands: 'Bollinger Bands',
  volume: 'Volume Confirm',
  priceSma200: 'Price vs SMA200',
  stochastic: 'Stochastic %K',
};

// ── Helpers ──

function directionColor(dir: SignalDirection): string {
  if (dir === 'bullish') return 'bg-emerald-500';
  if (dir === 'bearish') return 'bg-red-500';
  return 'bg-neutral-600';
}

function directionTextColor(dir: SignalDirection): string {
  if (dir === 'bullish') return 'text-emerald-400';
  if (dir === 'bearish') return 'text-red-400';
  return 'text-neutral-500';
}

function scoreColor(score: number): string {
  if (score >= 7.5) return 'from-emerald-500 to-emerald-600';
  if (score >= 6) return 'from-green-500 to-green-600';
  if (score >= 4) return 'from-amber-500 to-amber-600';
  if (score >= 2.5) return 'from-orange-500 to-orange-600';
  return 'from-red-500 to-red-600';
}

function scoreTextColor(score: number): string {
  if (score >= 7.5) return 'text-emerald-400';
  if (score >= 6) return 'text-green-400';
  if (score >= 4) return 'text-amber-400';
  if (score >= 2.5) return 'text-orange-400';
  return 'text-red-400';
}

function formatSignalValue(key: SignalKey, signal: ConfluenceSignal): string {
  const v = signal.value;
  if (typeof v === 'boolean') return v ? 'YES' : 'NO';
  if (key === 'rsi' || key === 'stochastic') return (v as number).toFixed(1);
  if (key === 'volume') return `${(v as number).toFixed(1)}x`;
  if (key === 'bollingerBands') return `${((v as number) * 100).toFixed(0)}%`;
  if (key === 'macd') return (v as number).toFixed(3);
  return String(v);
}

// ── i18n fallback helper ──

function makeTr(t: ReturnType<typeof useT>) {
  return (key: string, fallback: string): string => {
    try {
      return (t as (k: string) => string)(key) || fallback;
    } catch {
      return fallback;
    }
  };
}

// ── Main component ──

export function ConfluencePanel() {
  const t = useT();
  const tr = makeTr(t);
  const { data, isLoading, refetch } = useConfluence();
  const setSelectedSymbol = useAppStore((s) => s.setSelectedSymbol);

  const [filter, setFilter] = useState<FilterMode>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);

  const handleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(key === 'symbol'); }
  }, [sortKey, sortAsc]);

  const results = data?.results ?? [];

  const filtered = useMemo(() => {
    let items = [...results];
    if (filter === 'bullish') items = items.filter(r => r.direction === 'bullish');
    if (filter === 'bearish') items = items.filter(r => r.direction === 'bearish');

    items.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'symbol': cmp = a.symbol.localeCompare(b.symbol); break;
        case 'score': cmp = Math.abs(a.confluenceScore - 5) - Math.abs(b.confluenceScore - 5); break;
        case 'changePct': cmp = a.changePct - b.changePct; break;
        case 'bullish': cmp = a.bullishSignals - b.bullishSignals; break;
        case 'bearish': cmp = a.bearishSignals - b.bearishSignals; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return items;
  }, [results, filter, sortKey, sortAsc]);

  const counts = useMemo(() => {
    return {
      bullish: results.filter(r => r.direction === 'bullish').length,
      bearish: results.filter(r => r.direction === 'bearish').length,
      neutral: results.filter(r => r.direction === 'neutral').length,
    };
  }, [results]);

  const toggleExpand = useCallback((symbol: string) => {
    setExpandedSymbol(prev => prev === symbol ? null : symbol);
  }, []);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/30 shrink-0">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-amber-400" />
          <span className="text-[9px] font-black font-mono uppercase tracking-tighter text-amber-400">
            {tr('panelConfluence', 'TECHNICAL CONFLUENCE')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'heatmap' : 'table')}
            className="p-1 text-neutral/40 hover:text-amber-400 transition-colors"
            title={viewMode === 'table' ? 'Heatmap view' : 'Table view'}
          >
            {viewMode === 'table'
              ? <Grid3X3 className="w-3 h-3" />
              : <List className="w-3 h-3" />}
          </button>
          <button onClick={() => refetch()} className="p-1 text-neutral/40 hover:text-amber-400 transition-colors">
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter + summary */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/20 bg-black/60 shrink-0">
        <div className="flex gap-1">
          {(['all', 'bullish', 'bearish'] as FilterMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-2 py-0.5 text-[7px] font-black uppercase tracking-wider border transition-colors ${
                filter === mode
                  ? mode === 'bullish'
                    ? 'border-bullish/40 text-bullish bg-bullish/10'
                    : mode === 'bearish'
                      ? 'border-bearish/40 text-bearish bg-bearish/10'
                      : 'border-amber-400/40 text-amber-400 bg-amber-400/10'
                  : 'border-border/20 text-neutral/30 hover:text-neutral/60'
              }`}
            >
              {tr(`confluence_${mode}`, mode === 'all' ? 'All' : mode === 'bullish' ? 'Bullish' : 'Bearish')}
            </button>
          ))}
        </div>
        <div className="text-[8px] font-mono text-neutral/40">
          <span className="text-bullish">{counts.bullish}</span>
          {' / '}
          <span className="text-neutral/50">{counts.neutral}</span>
          {' / '}
          <span className="text-bearish">{counts.bearish}</span>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && results.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-amber-400 text-[9px] font-mono uppercase animate-pulse mb-1">
              {tr('confluenceScanning', 'Scanning confluence signals...')}
            </div>
            <div className="text-[7px] font-mono text-neutral/30">
              {tr('confluenceScanDesc', 'Analyzing 8 technical indicators across 30 stocks')}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && results.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-neutral/30 text-[9px] font-mono uppercase">
            {tr('confluenceNoData', 'No confluence data available')}
          </div>
        </div>
      )}

      {/* Main content */}
      {results.length > 0 && viewMode === 'table' && (
        <TableView
          items={filtered}
          sortKey={sortKey}
          sortAsc={sortAsc}
          onSort={handleSort}
          expandedSymbol={expandedSymbol}
          onToggleExpand={toggleExpand}
          onSelectSymbol={setSelectedSymbol}
          tr={tr}
        />
      )}

      {results.length > 0 && viewMode === 'heatmap' && (
        <HeatmapView
          items={filtered}
          onSelectSymbol={setSelectedSymbol}
          tr={tr}
        />
      )}

      {/* Signal Legend */}
      <div className="px-3 py-1 border-t border-border/30 bg-[#050505] shrink-0">
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {SIGNAL_KEYS.map(key => (
            <div key={key} className="flex items-center gap-1">
              <span className="text-[7px] font-mono font-bold text-amber-400/60">
                {SIGNAL_SHORT_LABELS[key]}
              </span>
              <span className="text-[6px] font-mono text-neutral/30">
                {SIGNAL_FULL_LABELS[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status bar */}
      <div className="px-3 py-0.5 border-t border-border/20 bg-[#050505] shrink-0 flex items-center justify-between">
        <span className="text-[7px] font-mono text-neutral/30">
          {filtered.length} / {results.length} {tr('confluenceStocks', 'stocks')}
        </span>
        {data?.timestamp && (
          <span className="text-[7px] font-mono text-neutral/20">
            {new Date(data.timestamp).toLocaleTimeString()}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Table View ──

function TableView({
  items,
  sortKey,
  sortAsc,
  onSort,
  expandedSymbol,
  onToggleExpand,
  onSelectSymbol,
  tr,
}: {
  items: ConfluenceResult[];
  sortKey: SortKey;
  sortAsc: boolean;
  onSort: (k: SortKey) => void;
  expandedSymbol: string | null;
  onToggleExpand: (s: string) => void;
  onSelectSymbol: (s: string | null) => void;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <>
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_0.45fr_0.4fr_0.35fr_repeat(8,0.2fr)] px-3 py-1 border-b border-border/20 text-[7px] font-black text-neutral/40 uppercase tracking-wider shrink-0 items-center">
        <ColHeader label={tr('symbol', 'Symbol')} k="symbol" current={sortKey} asc={sortAsc} onClick={onSort} />
        <ColHeader label={tr('confluenceScore', 'Score')} k="score" current={sortKey} asc={sortAsc} onClick={onSort} className="text-center" />
        <ColHeader label={tr('moversChange', 'Chg%')} k="changePct" current={sortKey} asc={sortAsc} onClick={onSort} className="text-right" />
        <span className="text-center">{tr('confluenceDir', 'Dir')}</span>
        {SIGNAL_KEYS.map(key => (
          <span key={key} className="text-center text-[6px]">{SIGNAL_SHORT_LABELS[key]}</span>
        ))}
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {items.map((item) => (
          <div key={item.symbol}>
            <div
              className="grid grid-cols-[1fr_0.45fr_0.4fr_0.35fr_repeat(8,0.2fr)] px-3 py-1.5 border-b border-border/10 hover:bg-white/[0.02] transition-colors items-center cursor-pointer group"
              onClick={() => onToggleExpand(item.symbol)}
            >
              {/* Symbol + price */}
              <div
                className="min-w-0 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onSelectSymbol(item.symbol); }}
              >
                <div className="text-[10px] font-mono font-bold text-white group-hover:text-amber-300 truncate">
                  {item.symbol}
                </div>
                <div className="text-[7px] font-mono text-neutral/30 truncate">
                  ${item.price.toFixed(2)}
                </div>
              </div>

              {/* Score bar */}
              <div className="flex items-center justify-center px-1">
                <ScoreBar score={item.confluenceScore} />
              </div>

              {/* Change % */}
              <span className={`text-[9px] font-mono font-bold text-right ${
                item.changePct >= 0 ? 'text-bullish' : 'text-bearish'
              }`}>
                {item.changePct >= 0 ? '+' : ''}{item.changePct.toFixed(2)}%
              </span>

              {/* Direction */}
              <div className="flex items-center justify-center">
                <span className={`text-[9px] font-mono font-bold ${
                  item.direction === 'bullish' ? 'text-emerald-400' : item.direction === 'bearish' ? 'text-red-400' : 'text-neutral-500'
                }`}>
                  {item.direction === 'bullish' ? '\u25B2' : item.direction === 'bearish' ? '\u25BC' : '\u25C6'}
                </span>
              </div>

              {/* Signal dots */}
              {SIGNAL_KEYS.map(key => (
                <div key={key} className="flex items-center justify-center">
                  <div className={`w-2 h-2 ${directionColor(item.signals[key].direction)}`} />
                </div>
              ))}
            </div>

            {/* Expanded detail row */}
            {expandedSymbol === item.symbol && (
              <ExpandedDetail item={item} tr={tr} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Score Bar ──

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  return (
    <div className="w-full flex items-center gap-1">
      <div className="flex-1 h-[6px] bg-neutral-900 overflow-hidden relative">
        <div
          className={`h-full bg-gradient-to-r ${scoreColor(score)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[8px] font-mono font-black min-w-[24px] text-right ${scoreTextColor(score)}`}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ── Expanded Detail Row ──

function ExpandedDetail({ item, tr }: { item: ConfluenceResult; tr: (key: string, fallback: string) => string }) {
  return (
    <div className="px-3 py-2 bg-amber-500/[0.03] border-b border-amber-500/10">
      {/* Signal detail grid */}
      <div className="grid grid-cols-4 gap-x-4 gap-y-1.5 mb-2">
        {SIGNAL_KEYS.map(key => {
          const signal = item.signals[key];
          return (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 shrink-0 ${directionColor(signal.direction)}`} />
              <span className="text-[7px] font-mono text-neutral/50 min-w-[32px]">
                {SIGNAL_SHORT_LABELS[key]}
              </span>
              <span className={`text-[8px] font-mono font-bold ${directionTextColor(signal.direction)}`}>
                {formatSignalValue(key, signal)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-4 text-[7px] font-mono text-neutral/40 border-t border-border/10 pt-1.5">
        <span>
          {tr('confluenceName', 'Name')}: <span className="text-neutral/60">{item.name}</span>
        </span>
        <span>
          {tr('confluenceBullish', 'Bullish')}: <span className="text-bullish">{item.bullishSignals}</span>
        </span>
        <span>
          {tr('confluenceBearish', 'Bearish')}: <span className="text-bearish">{item.bearishSignals}</span>
        </span>
        <span>
          {tr('confluenceNeutralCount', 'Neutral')}: <span className="text-neutral/60">{8 - item.bullishSignals - item.bearishSignals}</span>
        </span>
      </div>
    </div>
  );
}

// ── Heatmap View ──

function HeatmapView({
  items,
  onSelectSymbol,
  tr,
}: {
  items: ConfluenceResult[];
  onSelectSymbol: (s: string | null) => void;
  tr: (key: string, fallback: string) => string;
}) {
  return (
    <>
      {/* Heatmap header */}
      <div className="grid shrink-0 px-3 py-1 border-b border-border/20 text-[6px] font-black text-neutral/40 uppercase tracking-wider items-center"
        style={{ gridTemplateColumns: `60px 36px repeat(${SIGNAL_KEYS.length}, 1fr)` }}
      >
        <span>{tr('symbol', 'Symbol')}</span>
        <span className="text-center">{tr('confluenceScore', 'Score')}</span>
        {SIGNAL_KEYS.map(key => (
          <span key={key} className="text-center">{SIGNAL_SHORT_LABELS[key]}</span>
        ))}
      </div>

      {/* Heatmap body */}
      <div className="flex-1 overflow-auto no-scrollbar">
        {items.map((item) => (
          <div
            key={item.symbol}
            className="grid px-3 py-[3px] border-b border-border/5 hover:bg-white/[0.02] transition-colors cursor-pointer items-center"
            style={{ gridTemplateColumns: `60px 36px repeat(${SIGNAL_KEYS.length}, 1fr)` }}
            onClick={() => onSelectSymbol(item.symbol)}
          >
            {/* Symbol */}
            <span className="text-[8px] font-mono font-bold text-white truncate">
              {item.symbol}
            </span>

            {/* Score badge */}
            <div className="flex justify-center">
              <span className={`text-[7px] font-mono font-black px-1 ${scoreTextColor(item.confluenceScore)} bg-black`}>
                {item.confluenceScore.toFixed(1)}
              </span>
            </div>

            {/* Signal cells */}
            {SIGNAL_KEYS.map(key => {
              const signal = item.signals[key];
              return (
                <div key={key} className="flex justify-center px-[1px]">
                  <div
                    className={`w-full h-[14px] ${heatmapCellColor(signal.direction)} flex items-center justify-center`}
                    title={`${SIGNAL_FULL_LABELS[key]}: ${formatSignalValue(key, signal)} (${signal.direction})`}
                  >
                    <span className="text-[6px] font-mono font-bold text-white/70">
                      {formatSignalValue(key, signal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

function heatmapCellColor(dir: SignalDirection): string {
  if (dir === 'bullish') return 'bg-emerald-600/50';
  if (dir === 'bearish') return 'bg-red-600/50';
  return 'bg-neutral-800/50';
}

// ── Reusable column header ──

function ColHeader({ label, k, current, asc, onClick, className = '' }: {
  label: string;
  k: SortKey;
  current: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
  className?: string;
}) {
  const active = current === k;
  return (
    <button
      onClick={() => onClick(k)}
      className={`${className} ${active ? 'text-amber-400' : ''} flex items-center gap-0.5`}
    >
      {label}
      {active && (
        asc
          ? <ChevronUp className="w-2 h-2" />
          : <ChevronDown className="w-2 h-2" />
      )}
    </button>
  );
}
