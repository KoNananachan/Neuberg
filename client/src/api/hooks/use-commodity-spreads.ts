import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface SpreadLeg {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

export interface CommoditySpread {
  name: string;
  category: 'energy' | 'agriculture' | 'metals';
  longLeg: SpreadLeg;
  shortLeg: SpreadLeg;
  currentSpread: number;
  spreadType: 'ratio' | 'absolute';
  avg20d: number;
  avg60d: number;
  zScore: number;
  percentile: number;
  direction: 'widening' | 'narrowing' | 'stable';
  signal: 'cheap' | 'fair' | 'expensive';
  description: string;
  history: number[];
}

export interface CommoditySpreadsData {
  timestamp: string;
  spreads: CommoditySpread[];
  summary: {
    energySentiment: string;
    metalsSentiment: string;
    agSentiment: string;
  };
}

export function useCommoditySpreads() {
  return useQuery({
    queryKey: ['commodity-spreads'],
    queryFn: () => api.get<CommoditySpreadsData>('/commodity-spreads'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
