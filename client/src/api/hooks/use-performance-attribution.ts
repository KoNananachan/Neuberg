import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface SectorAttribution {
  sector: string;
  weight: number;
  benchmarkWeight: number;
  activeWeight: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  allocationEffect: number;
  selectionEffect: number;
  interactionEffect: number;
  totalEffect: number;
  topContributor: string;
  topDetractor: string;
}

export interface FactorAttribution {
  factor: string;
  exposure: number;
  factorReturn: number;
  contribution: number;
  tStat: number;
}

export interface PeriodReturn {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  activeReturn: number;
  trackingError: number;
  informationRatio: number;
}

export interface AttributionResponse {
  benchmark: string;
  sectors: SectorAttribution[];
  factors: FactorAttribution[];
  periods: PeriodReturn[];
  summary: {
    totalActiveReturn: number;
    allocationTotal: number;
    selectionTotal: number;
    interactionTotal: number;
    sharpeRatio: number;
    beta: number;
    alpha: number;
    r2: number;
    maxDrawdown: number;
    winRate: number;
  };
  cumulativeReturns: { date: string; portfolio: number; benchmark: number }[];
  timestamp: string;
}

export function usePerformanceAttribution(benchmark = 'SPY') {
  return useQuery({
    queryKey: ['performance-attribution', benchmark],
    queryFn: () => api.get<AttributionResponse>(`/performance-attribution?benchmark=${benchmark}`),
    refetchInterval: 30 * 60_000,
    staleTime: 2 * 60_000,
  });
}
