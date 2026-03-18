import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ETFHolding {
  symbol: string;
  name: string;
  weight: number;
  shares: number;
}

export interface SectorWeight {
  sector: string;
  weight: number;
}

export interface ETFStats {
  totalHoldings: number;
  top10Weight: number;
  turnover: number | null;
  beta: number | null;
  yield: number | null;
}

export interface ETFHoldingsData {
  symbol: string;
  name: string;
  price: number;
  aum: number | null;
  expenseRatio: number | null;
  holdings: ETFHolding[];
  sectorWeights: SectorWeight[];
  stats: ETFStats;
  updatedAt: string;
}

export function useETFHoldings(symbol: string) {
  return useQuery<ETFHoldingsData>({
    queryKey: ['etf-holdings', symbol],
    queryFn: () => api.get<ETFHoldingsData>(`/etf-holdings/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 60 * 60_000, // 1 hour
    refetchInterval: 60 * 60_000,
  });
}
