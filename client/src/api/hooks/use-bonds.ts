import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface YieldPoint {
  symbol: string;
  maturity: string;
  years: number;
  yield: number;
  change: number;
  changePercent: number;
}

export interface BondEtf {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface BondsData {
  yields: YieldPoint[];
  etfs: BondEtf[];
  spreads: { name: string; value: number }[];
}

export function useBonds() {
  return useQuery({
    queryKey: ['bonds'],
    queryFn: () => api.get<BondsData>('/bonds'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
