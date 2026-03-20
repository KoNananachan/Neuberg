import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface StrategyReturn {
  strategy: string;
  category: string;
  mtd: number;
  ytd: number;
  threeYearAnn: number;
  volatility: number;
  sharpe: number;
  maxDrawdown: number;
  beta: number;
}

export interface AumFlow {
  month: string;
  totalAum: number;
  netFlow: number;
  inflows: number;
  outflows: number;
  redemptionRate: number;
}

export interface CrowdedTrade {
  symbol: string;
  name: string;
  crowdingScore: number;
  direction: 'long' | 'short';
  holdersCount: number;
  pctOfAum: number;
  potentialImpact: 'high' | 'medium' | 'low';
}

export interface LeverageRisk {
  grossExposure: number;
  netExposure: number;
  leverageRatio: number;
  var95: number;
  var99: number;
  liquidityDays: number;
  marginUtilization: number;
  concentrationTop10: number;
}

export interface HedgeFundMonitorData {
  timestamp: string;
  strategyReturns: StrategyReturn[];
  aumFlows: AumFlow[];
  crowdedTrades: CrowdedTrade[];
  leverageRisk: LeverageRisk;
}

export function useHedgeFundMonitor() {
  return useQuery<HedgeFundMonitorData>({
    queryKey: ['hedge-fund-monitor'],
    queryFn: () => api.get<HedgeFundMonitorData>('/hedge-fund-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
