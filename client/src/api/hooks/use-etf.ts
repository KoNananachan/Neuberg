import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ETFData {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: number;
  avgVolume: number | null;
  ytdReturn: number | null;
  category: string;
}

export function useETF() {
  return useQuery({
    queryKey: ['etf'],
    queryFn: () => api.get<ETFData[]>('/etf'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
