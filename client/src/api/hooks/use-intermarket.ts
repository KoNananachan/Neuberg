import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface IntermarketPair {
  name: string;
  symbolA: string;
  symbolB: string;
  expectedRelation: 'inverse' | 'positive';
  correlation20d: number;
  correlation60d: number;
  returnA_5d: number;
  returnB_5d: number;
  divergent: boolean;
  divergenceScore: number;
  signal: string;
  priceA: number;
  priceB: number;
  changeA: number;
  changeB: number;
  historyA: number[];
  historyB: number[];
}

export interface IntermarketSummary {
  divergenceCount: number;
  riskLevel: 'low' | 'elevated' | 'high';
  dominantTheme: string;
}

export interface IntermarketData {
  timestamp: string;
  pairs: IntermarketPair[];
  summary: IntermarketSummary;
}

export function useIntermarket() {
  return useQuery<IntermarketData>({
    queryKey: ['intermarket'],
    queryFn: () => api.get<IntermarketData>('/intermarket'),
    staleTime: 60 * 60_000,
  });
}
