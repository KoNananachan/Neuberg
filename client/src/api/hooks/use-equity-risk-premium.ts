import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ErpMarket {
  market: string;
  index: string;
  earningsYield: number;
  dividendYield: number;
  riskFreeRate: number;
  erp: number;
  erpDividend: number;
  pe: number;
  forwardPe: number;
  cape: number;
  impliedReturn: number;
  erpHistory: number[];
  percentile: number;
  signal: string | null;
}

export interface ErpDecomposition {
  component: string;
  value: number;
}

export interface EquityRiskPremiumData {
  markets: ErpMarket[];
  decomposition: ErpDecomposition[];
  globalAvgErp: number;
  usErpVs20YrAvg: number;
  timestamp: string;
}

export function useEquityRiskPremium() {
  return useQuery({
    queryKey: ['equity-risk-premium'],
    queryFn: () => api.get<EquityRiskPremiumData>('/equity-risk-premium'),
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
}
