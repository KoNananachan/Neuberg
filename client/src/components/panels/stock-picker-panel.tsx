import { useMemo, useState } from 'react';
import { GlassCard } from '../common/glass-card';
import { usePortfolioStore } from '../../stores/use-portfolio-store';
import { useQueries } from '@tanstack/react-query';
import { api } from '../../api/client';
import { buildStockCard } from '../../lib/valuation';
import type { StockCard, ValuationStatus } from '../../types/stock-card';
import { Plus, Trash2, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import { EditEntryModal } from './iv/edit-entry-modal';

// ── colour helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ValuationStatus, string> = {
  STRONG_BUY: 'text-[#00ff00]',
  BUY: 'text-[#66ff66]',
  WATCH: 'text-yellow-400',
  EXPENSIVE: 'text-[#ff0000]',
};

const STATUS_LABELS: Record<ValuationStatus, string> = {
  STRONG_BUY: 'STRONG BUY',
  BUY: 'BUY',
  WATCH: 'WATCH',
  EXPENSIVE: 'EXPENSIVE',
};

type SortKey = keyof Pick<
  StockCard,
  'ticker' | 'price_current' | 'fair_value_estimate' | 'discount_pct' | 'conviction_score' | 'room_to_add' | 'priority_score'
>;

function fmt(n: number | null | undefined, decimals = 2, prefix = ''): string {
  if (n == null) return '--';
  return `${prefix}${n.toFixed(decimals)}`;
}
function fmtPct(n: number | null | undefined): string {
  if (n == null) return '--';
  return `${(n * 100).toFixed(1)}%`;
}
function fmtPrice(n: number | null | undefined): string {
  if (n == null) return '--';
  return `$${n.toFixed(2)}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StockPickerPanel() {
  const { entries, totalPortfolioValue, removeEntry } = usePortfolioStore();
  const tickers = Object.keys(entries);

  const [sortKey, setSortKey] = useState<SortKey>('priority_score');
  const [sortAsc, setSortAsc] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editTicker, setEditTicker] = useState<string | null>(null);

  // Batch-fetch quote + profile for every ticker
  const quoteQueries = useQueries({
    queries: tickers.map((t) => ({
      queryKey: ['stock-detail', t],
      queryFn: () => api.get<any>(`/stocks/${t}`).then((r: any) => r),
      staleTime: 60_000,
    })),
  });

  const cards = useMemo<StockCard[]>(() => {
    return tickers.flatMap((t, i) => {
      const result = quoteQueries[i]?.data;
      if (!result?.quote) return [];
      return [buildStockCard(entries[t], result.quote, result.profile, totalPortfolioValue)];
    });
  }, [tickers, quoteQueries, entries, totalPortfolioValue]);

  const sorted = useMemo(() => {
    return [...cards].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (av === bv) return 0;
      const cmp = av < bv ? -1 : 1;
      return sortAsc ? cmp : -cmp;
    });
  }, [cards, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null;
    return sortAsc ? <ChevronUp className="w-2.5 h-2.5 inline ml-0.5" /> : <ChevronDown className="w-2.5 h-2.5 inline ml-0.5" />;
  }

  const isLoading = quoteQueries.some((q) => q.isLoading);

  return (
    <GlassCard
      title="STOCK PICKER"
      headerRight={
        <div className="flex items-center gap-1">
          {isLoading && <RefreshCw className="w-3 h-3 text-accent animate-spin" />}
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-0.5 text-[10px] text-accent hover:text-white transition-colors border border-accent px-1.5 py-0.5"
          >
            <Plus className="w-2.5 h-2.5" />ADD
          </button>
        </div>
      }
      className="h-full"
    >
      {tickers.length === 0 ? (
        <EmptyState onAdd={() => setAddModalOpen(true)} />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-[10px] font-mono border-collapse">
            <thead className="sticky top-0 bg-black z-10">
              <tr className="border-b border-border">
                {([
                  ['TICKER', 'ticker'],
                  ['PRICE', 'price_current'],
                  ['FAIR VALUE', 'fair_value_estimate'],
                  ['DISCOUNT', 'discount_pct'],
                  ['STATUS', null],
                  ['SECTOR', null],
                  ['CONV', 'conviction_score'],
                  ['ROOM', 'room_to_add'],
                  ['SCORE', 'priority_score'],
                ] as [string, SortKey | null][]).map(([label, key]) => (
                  <th
                    key={label}
                    onClick={() => key && toggleSort(key)}
                    className={`text-left px-2 py-1 text-neutral/50 uppercase tracking-widest ${key ? 'cursor-pointer hover:text-accent' : ''}`}
                  >
                    {label}{key && <SortIcon k={key} />}
                  </th>
                ))}
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((card) => (
                <tr
                  key={card.ticker}
                  onClick={() => setEditTicker(card.ticker)}
                  className="border-b border-border/30 hover:bg-hover cursor-pointer"
                >
                  <td className="px-2 py-1 text-accent font-bold">{card.ticker}</td>
                  <td className="px-2 py-1 text-white">{fmtPrice(card.price_current)}</td>
                  <td className="px-2 py-1 text-neutral">{fmtPrice(card.fair_value_estimate)}</td>
                  <td className={`px-2 py-1 font-bold ${card.discount_pct >= 0 ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
                    {fmtPct(card.discount_pct)}
                  </td>
                  <td className={`px-2 py-1 font-bold ${STATUS_COLORS[card.valuation_status]}`}>
                    {STATUS_LABELS[card.valuation_status]}
                  </td>
                  <td className="px-2 py-1 text-neutral/70">{card.sector || '--'}</td>
                  <td className="px-2 py-1 text-center">
                    <ConvictionDots score={card.conviction_score} />
                  </td>
                  <td className="px-2 py-1 text-neutral">{fmtPct(card.room_to_add)}</td>
                  <td className="px-2 py-1 text-white font-bold">{fmt(card.priority_score, 2)}</td>
                  <td className="px-2 py-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeEntry(card.ticker); }}
                      className="text-neutral/30 hover:text-[#ff0000] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(addModalOpen || editTicker) && (
        <EditEntryModal
          ticker={editTicker}
          onClose={() => { setAddModalOpen(false); setEditTicker(null); }}
        />
      )}
    </GlassCard>
  );
}

function ConvictionDots({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5 justify-center">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${i <= score ? 'bg-accent' : 'bg-border'}`}
        />
      ))}
    </span>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-neutral/40">
      <p className="text-[10px] font-mono uppercase tracking-widest">No stocks tracked yet</p>
      <button
        onClick={onAdd}
        className="text-[10px] font-mono border border-accent text-accent px-3 py-1 hover:bg-accent hover:text-black transition-colors"
      >
        + ADD STOCK
      </button>
    </div>
  );
}
