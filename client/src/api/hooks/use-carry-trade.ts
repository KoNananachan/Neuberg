import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CarryPairData {
  name: string;
  symbol: string;
  category: 'g10' | 'em';
  spot: number;
  changePct: number;
  return20d: number;
  return60d: number;
  vol20d: number;
  carryEstimate: number;
  carryToVol: number;
  totalReturn20d: number;
  trend: 'favorable' | 'neutral' | 'adverse';
  risk: 'low' | 'moderate' | 'high';
  signal: 'attractive' | 'neutral' | 'dangerous';
  sparkline: number[];
}

export interface YieldDifferential {
  pair: string;
  differential: number;
  direction: 'widening' | 'narrowing' | 'stable';
}

export interface CarryTradeSummary {
  g10Carry: number;
  emCarry: number;
  yenStatus: string;
  environment: 'favorable' | 'neutral' | 'hostile';
  narrative: string;
}

export interface CarryTradeData {
  timestamp: string;
  pairs: CarryPairData[];
  summary: CarryTradeSummary;
  yieldDifferentials: YieldDifferential[];
}

export function useCarryTrade() {
  return useQuery<CarryTradeData>({
    queryKey: ['carry-trade'],
    queryFn: () => api.get<CarryTradeData>('/carry-trade'),
    staleTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}
