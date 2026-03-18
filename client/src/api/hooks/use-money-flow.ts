import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FlowData {
  symbol: string;
  name: string;
  category: 'index' | 'sector' | 'fixed_income' | 'commodity' | 'international';
  price: number;
  change: number;
  mfi: number;
  netFlow5d: number;
  netFlow1d: number;
  avgVolume: number;
  volumeRatio: number;
  signal: 'inflow' | 'outflow' | 'neutral';
}

export interface MoneyFlowData {
  flows: FlowData[];
  updatedAt: string;
}

export function useMoneyFlow() {
  return useQuery<MoneyFlowData>({
    queryKey: ['money-flow'],
    queryFn: () => api.get<MoneyFlowData>('/money-flow'),
    refetchInterval: 10 * 60 * 1000,
    staleTime: 5 * 60 * 1000,
  });
}
