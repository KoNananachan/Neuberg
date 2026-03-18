import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface EconomicSurpriseIndicator {
  name: string;
  symbol: string;
  category: 'growth' | 'inflation' | 'sentiment';
  currentValue: number;
  sma20: number;
  zScore: number;
  signal: 'positive' | 'neutral' | 'negative';
  changePct: number;
  sparkline: number[];
}

export interface EconomicSurpriseHistory {
  date: string;
  composite: number;
  growth: number;
  inflation: number;
}

export interface EconomicSurprisesData {
  timestamp: string;
  compositeIndex: number;
  growthIndex: number;
  inflationIndex: number;
  level: 'strong_beat' | 'modest_beat' | 'neutral' | 'modest_miss' | 'strong_miss';
  indicators: EconomicSurpriseIndicator[];
  history: EconomicSurpriseHistory[];
}

export function useEconomicSurprises() {
  return useQuery<EconomicSurprisesData>({
    queryKey: ['economic-surprises'],
    queryFn: () => api.get<EconomicSurprisesData>('/economic-surprises'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
