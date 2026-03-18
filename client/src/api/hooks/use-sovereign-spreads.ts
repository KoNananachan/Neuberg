import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface TenorSpread {
  tenor: string;
  spread: number;
}

export interface SovereignSpread {
  pair: string;
  name: string;
  category: string;
  benchmarkTenor: string;
  yieldA: number;
  yieldB: number;
  spread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  avgSpread1y: number;
  deviationFromAvg: number;
  history: number[];
  signal: string | null;
  tenorSpreads: TenorSpread[];
}

export interface SovereignSpreadsData {
  spreads: SovereignSpread[];
  peripheralIndex: number;
  peripheralChange: number;
  timestamp: string;
}

export function useSovereignSpreads() {
  return useQuery<SovereignSpreadsData>({
    queryKey: ['sovereign-spreads'],
    queryFn: () => api.get<SovereignSpreadsData>('/sovereign-spreads'),
    refetchInterval: 2 * 60_000,
    staleTime: 1 * 60_000,
  });
}
