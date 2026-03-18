import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface RiskParityAsset {
  name: string;
  symbol: string;
  class: 'equity' | 'bond' | 'commodity' | 'real_estate' | 'cash';
  price: number;
  changePct: number;
  return20d: number;
  return60d: number;
  vol20d: number;
  vol60d: number;
  sharpe: number;
  riskParityWeight: number;
  equalWeight: number;
  riskContribution: number;
  sparkline: number[];
}

export interface PortfolioStats {
  vol: number;
  expectedReturn: number;
  sharpe: number;
}

export interface RiskBudgetEntry {
  name: string;
  equalWeightRisk: number;
  riskParityRisk: number;
}

export interface RiskParityData {
  timestamp: string;
  assets: RiskParityAsset[];
  portfolio: {
    riskParity: PortfolioStats;
    equalWeight: PortfolioStats;
  };
  correlationMatrix: {
    symbols: string[];
    values: number[][];
  };
  riskBudget: RiskBudgetEntry[];
}

export function useRiskParity() {
  return useQuery({
    queryKey: ['risk-parity'],
    queryFn: () => api.get<RiskParityData>('/risk-parity'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
