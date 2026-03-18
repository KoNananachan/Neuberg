import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface AnalystRating {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  recommendationMean: number | null;
  recommendationKey: string | null;
  numberOfAnalysts: number | null;
  upside: number | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

export function useAnalystRatings() {
  return useQuery<AnalystRating[]>({
    queryKey: ['analyst-ratings'],
    queryFn: () => api.get('/analyst'),
    refetchInterval: 600_000, // 10 min
    staleTime: 300_000, // 5 min
  });
}
