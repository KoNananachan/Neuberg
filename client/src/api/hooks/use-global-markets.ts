import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  category: string;
}

export function useGlobalMarkets() {
  return useQuery({
    queryKey: ['global-markets'],
    queryFn: () => api.get<MarketItem[]>('/global-markets'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
