import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CommodityQuote {
  symbol: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

export function useCommodities() {
  return useQuery({
    queryKey: ['commodities'],
    queryFn: () => api.get<CommodityQuote[]>('/commodities'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
