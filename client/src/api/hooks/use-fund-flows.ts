import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FundFlowEtf {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  aum: number;
  volume: number;
  flow5d: number;
  flow20d: number;
  flowTrend: 'inflow' | 'outflow' | 'neutral';
  flowHistory: number[];
}

export interface FundFlowCategory {
  name: string;
  totalFlow5d: number;
  totalFlow20d: number;
  trend: 'inflow' | 'outflow' | 'neutral';
  etfs: FundFlowEtf[];
}

export interface FundFlowSummary {
  netEquityFlow: number;
  netBondFlow: number;
  netCommodityFlow: number;
  riskAppetite: 'risk_on' | 'risk_off' | 'neutral';
  rotationSignal: string;
}

export interface FundFlowsData {
  timestamp: string;
  categories: FundFlowCategory[];
  summary: FundFlowSummary;
}

export function useFundFlows() {
  return useQuery<FundFlowsData>({
    queryKey: ['fund-flows'],
    queryFn: () => api.get<FundFlowsData>('/fund-flows'),
    staleTime: 60 * 60 * 1000,
  });
}
