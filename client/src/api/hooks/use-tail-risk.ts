import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface TailRiskIndicator {
  name: string;
  symbol: string;
  category: 'volatility' | 'credit' | 'flight_to_safety' | 'contagion' | 'speculative';
  currentValue: number;
  zScore: number;
  percentile: number;
  direction: 'rising' | 'stable' | 'falling';
  alertLevel: 'normal' | 'watch' | 'warning' | 'critical';
  description: string;
  sparkline: number[];
}

export interface CompositeHistory {
  date: string;
  compositeScore: number;
}

export interface TailRiskData {
  timestamp: string;
  compositeScore: number;
  level: 'complacent' | 'normal' | 'elevated' | 'high' | 'extreme';
  indicators: TailRiskIndicator[];
  history: CompositeHistory[];
  alerts: string[];
}

export function useTailRisk() {
  return useQuery({
    queryKey: ['tail-risk'],
    queryFn: () => api.get<TailRiskData>('/tail-risk'),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });
}
