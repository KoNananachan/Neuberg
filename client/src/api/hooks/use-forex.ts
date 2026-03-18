import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FxPair {
  symbol: string;
  pair: string;
  name: string;
  rate: number;
  change: number;
  changePercent: number;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

export function useForexRates() {
  return useQuery({
    queryKey: ['forex', 'rates'],
    queryFn: () => api.get<FxPair[]>('/forex'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
