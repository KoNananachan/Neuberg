import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface IrsSwapRate {
  currency: string;
  tenor: string;
  fixedRate: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

export interface IrsBasisSwap {
  pair: string;
  tenor: string;
  spread: number;
  change1d: number;
  change1w: number;
}

export interface IrsSwapSpread {
  tenor: string;
  swapRate: number;
  treasuryYield: number;
  spread: number;
  percentile: number;
}

export interface IrsForwardRate {
  label: string;
  tenor: string;
  forwardRate: number;
  spotRate: number;
  impliedCuts: number;
}

export interface IrsMonitorSummary {
  usd10y: number;
  eur10y: number;
  gbp10y: number;
  jpy10y: number;
  avgSwapSpread: number;
  timestamp: string;
}

export interface IrsMonitorData {
  swapRates: IrsSwapRate[];
  basisSwaps: IrsBasisSwap[];
  swapSpreads: IrsSwapSpread[];
  forwardRates: IrsForwardRate[];
  summary: IrsMonitorSummary;
}

export function useIrsMonitor() {
  return useQuery<IrsMonitorData>({
    queryKey: ['irs-monitor'],
    queryFn: () => api.get<IrsMonitorData>('/irs-monitor'),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
