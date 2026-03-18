import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface SwapRate {
  currency: string;
  tenor: string;
  rate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  spread2s10s: number | null;
  spreadVsTreasury: number;
  history: number[];
}

export interface SwapCurve {
  currency: string;
  tenors: string[];
  rates: number[];
  prevRates: number[];
  weekAgoRates: number[];
  monthAgoRates: number[];
}

export interface SwapRatesData {
  rates: SwapRate[];
  curves: SwapCurve[];
  butterfly: {
    currency: string;
    value: number;
    change: number;
  }[];
  timestamp: string;
}

export function useSwapRates() {
  return useQuery<SwapRatesData>({
    queryKey: ['swap-rates'],
    queryFn: () => api.get<SwapRatesData>('/swap-rates'),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}
