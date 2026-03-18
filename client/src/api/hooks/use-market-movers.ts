import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface MoverQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number | null;
  avgVolume: number | null;
}

interface MoversData {
  gainers: MoverQuote[];
  losers: MoverQuote[];
  actives: MoverQuote[];
}

export function useMarketMovers() {
  return useQuery({
    queryKey: ['market-movers'],
    queryFn: () => api.get<MoversData>('/market-movers'),
    refetchInterval: 120_000, // 2 min
    staleTime: 60_000,
  });
}
