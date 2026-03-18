import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface MarginLendingRate {
  assetClass: string;
  symbol: string;
  rate: number;
  marginRequirement: number;
  haircut: number;
  utilization: number;
  trend: 'rising' | 'stable' | 'falling';
}

export interface RehypothecationData {
  totalCollateralReceived: number;
  totalRehypothecated: number;
  rehypRate: number;
  rehypLimit: number;
  headroom: number;
  collateralBreakdown: Array<{
    type: string;
    amount: number;
    pct: number;
  }>;
}

export interface CollateralTransformation {
  id: string;
  fromAsset: string;
  toAsset: string;
  notional: number;
  spread: number;
  costBps: number;
  tenor: string;
  status: 'active' | 'pending' | 'matured';
}

export interface FinancingSummary {
  totalBookSize: number;
  netFinancingRevenue: number;
  revenueChange: number;
  avgRate: number;
  totalMarginCalls: number;
  marginCallValue: number;
  pendingSettlements: number;
  utilizationPct: number;
}

export interface SecuritiesFinanceData {
  timestamp: string;
  marginLending: MarginLendingRate[];
  rehypothecation: RehypothecationData;
  collateralTransformations: CollateralTransformation[];
  summary: FinancingSummary;
}

export function useSecuritiesFinance() {
  return useQuery<SecuritiesFinanceData>({
    queryKey: ['securities-finance'],
    queryFn: () => api.get<SecuritiesFinanceData>('/securities-finance'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
