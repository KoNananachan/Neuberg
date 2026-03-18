import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface RegionalFlow {
  name: string;
  category: 'equity' | 'fixed-income' | 'commodity' | 'alternative' | 'cash';
  region: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  flow3m: number;
  flowYtd: number;
  aum: number;
  flowPctAum: number;
}

export interface TopETF {
  ticker: string;
  name: string;
  flow1d: number;
  flow1w: number;
  flow1m: number;
  aum: number;
  flowStreak: number;
}

export interface SentimentIndicators {
  equityFlowMomentum: number;
  bondFlowMomentum: number;
  riskOnOffScore: number;
  cashAllocation: number;
  contraindicatorSignal: 'bullish' | 'bearish' | 'neutral';
}

export interface GlobalFlowsData {
  regional: RegionalFlow[];
  topETFs: TopETF[];
  sentiment: SentimentIndicators;
  generatedAt: string;
}

export function useGlobalFlows() {
  return useQuery<GlobalFlowsData>({
    queryKey: ['global-flows'],
    queryFn: () => api.get<GlobalFlowsData>('/global-flows'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
