import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StockCardInput } from '../types/stock-card';
import { DEFAULT_CARD_INPUT } from '../types/stock-card';

export interface PortfolioState {
  // Manual entries keyed by ticker
  entries: Record<string, StockCardInput>;
  // Total portfolio value in USD (for weight calculations)
  totalPortfolioValue: number;
  // Active ticker in research/detail view
  activeResearchTicker: string | null;

  // Actions
  upsertEntry: (ticker: string, data: Partial<Omit<StockCardInput, 'ticker'>>) => void;
  removeEntry: (ticker: string) => void;
  setTotalPortfolioValue: (v: number) => void;
  setActiveResearchTicker: (t: string | null) => void;
  importCsv: (rows: Array<{ ticker: string; shares: number; value: number }>) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      entries: {},
      totalPortfolioValue: 0,
      activeResearchTicker: null,

      upsertEntry: (ticker, data) => {
        const t = ticker.toUpperCase();
        set((s) => ({
          entries: {
            ...s.entries,
            [t]: {
              ...DEFAULT_CARD_INPUT,
              ...s.entries[t],
              ...data,
              ticker: t,
            } as StockCardInput,
          },
        }));
      },

      removeEntry: (ticker) => {
        set((s) => {
          const next = { ...s.entries };
          delete next[ticker.toUpperCase()];
          return { entries: next };
        });
      },

      setTotalPortfolioValue: (v) => set({ totalPortfolioValue: v }),

      setActiveResearchTicker: (t) => set({ activeResearchTicker: t }),

      importCsv: (rows) => {
        const { entries } = get();
        const next = { ...entries };
        for (const row of rows) {
          const t = row.ticker.toUpperCase();
          next[t] = {
            ...DEFAULT_CARD_INPUT,
            ...next[t],
            ticker: t,
            current_shares: row.shares,
          } as StockCardInput;
        }
        set({ entries: next });
      },
    }),
    {
      name: 'investor-portfolio',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
