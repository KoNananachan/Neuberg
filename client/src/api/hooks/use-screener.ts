import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ScreenResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number | null;
  marketCap: number | null;
  pe: number | null;
  eps: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

export function useScreener() {
  return useQuery({
    queryKey: ['screener'],
    queryFn: () => api.get<ScreenResult[]>('/screener'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
