import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FutureData {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number;
  openInterest: number | null;
  underlyingSymbol: string | null;
  underlyingPrice: number | null;
  fairValueSpread: number | null;
}

export function useFutures() {
  return useQuery({
    queryKey: ['futures'],
    queryFn: () => api.get<FutureData[]>('/futures'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
