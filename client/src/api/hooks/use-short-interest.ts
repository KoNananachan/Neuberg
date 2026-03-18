import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ShortInterestData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  sharesShort: number | null;
  shortRatio: number | null;
  shortPercentOfFloat: number | null;
  sharesShortPriorMonth: number | null;
  shortChangePercent: number | null;
  volume: number;
  avgVolume: number | null;
  marketCap: number | null;
}

export function useShortInterest() {
  return useQuery<ShortInterestData[]>({
    queryKey: ['short-interest'],
    queryFn: () => api.get('/short-interest'),
    refetchInterval: 600_000, // 10 min
    staleTime: 300_000, // 5 min
  });
}
