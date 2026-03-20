import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CapitalFlowEtf {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  flow5d: number;
  flowHistory: number[]; // 20 daily values
}

export interface CapitalFlowRegion {
  name: string;
  flow5d: number;
  flow20d: number;
  trend: 'strong_inflow' | 'inflow' | 'neutral' | 'outflow' | 'strong_outflow';
  changePct: number;
  etfs: CapitalFlowEtf[];
}

export interface CapitalFlowMapEntry {
  from: string;
  to: string;
  magnitude: number; // 0-10
  description: string;
}

export interface CapitalFlowSummary {
  dmVsEm: 'dm_favored' | 'em_favored' | 'balanced';
  riskRotation: 'risk_on' | 'risk_off' | 'neutral';
  topInflow: string;
  topOutflow: string;
  carryTradeSignal: 'active' | 'unwinding' | 'neutral';
  narrative: string;
}

export interface CapitalFlowsData {
  timestamp: string;
  regions: CapitalFlowRegion[];
  flowMap: CapitalFlowMapEntry[];
  summary: CapitalFlowSummary;
}

export function useCapitalFlows() {
  return useQuery<CapitalFlowsData>({
    queryKey: ['capital-flows'],
    queryFn: () => api.get<CapitalFlowsData>('/capital-flows'),
    staleTime: 60 * 60 * 1000,
  });
}
