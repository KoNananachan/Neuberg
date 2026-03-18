import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface PairsRatioPoint {
  timestamp: number;
  ratio: number;
}

export interface PairsSpreadPoint {
  timestamp: number;
  spread: number;
}

export interface PairsStats {
  currentRatio: number;
  meanRatio: number;
  stdRatio: number;
  zScore: number;
  correlation: number;
  cointegration: number;
  minRatio: number;
  maxRatio: number;
  percentile: number;
}

export interface PairsData {
  symbolA: string;
  symbolB: string;
  nameA: string;
  nameB: string;
  currentPriceA: number;
  currentPriceB: number;
  ratioSeries: PairsRatioPoint[];
  spreadSeries: PairsSpreadPoint[];
  stats: PairsStats;
}

export function usePairs(symbolA: string, symbolB: string, range: string) {
  return useQuery<PairsData>({
    queryKey: ['pairs', symbolA, symbolB, range],
    queryFn: () => api.get<PairsData>(`/pairs?symbolA=${encodeURIComponent(symbolA)}&symbolB=${encodeURIComponent(symbolB)}&range=${range}`),
    enabled: !!symbolA && !!symbolB && symbolA !== symbolB,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
}
