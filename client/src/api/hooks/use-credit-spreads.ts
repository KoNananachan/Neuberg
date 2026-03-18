import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CreditInstrument {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  yield: number | null;
  ytdReturn: number | null;
}

export interface SpreadHistory {
  date: string;
  value: number;
}

export interface SpreadData {
  current: number;
  change5d: number;
  change1m: number;
  trend: 'tightening' | 'widening' | 'stable';
  history: SpreadHistory[];
}

export interface YieldCurveData {
  threeMonth: number;
  tenYear: number;
  thirtyYear: number;
  spread2s10s: number;
  inverted: boolean;
}

export interface CreditSpreadsData {
  timestamp: string;
  instruments: CreditInstrument[];
  spreads: {
    hy: SpreadData;
    ig: SpreadData;
    em: SpreadData;
  };
  riskSentiment: 'Risk On' | 'Risk Off' | 'Neutral';
  yieldCurve: YieldCurveData;
}

export function useCreditSpreads() {
  return useQuery({
    queryKey: ['credit-spreads'],
    queryFn: () => api.get<CreditSpreadsData>('/credit-spreads'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
