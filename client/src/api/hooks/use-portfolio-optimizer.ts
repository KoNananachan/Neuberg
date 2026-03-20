import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface AssetInfo {
  symbol: string;
  name: string;
  annReturn: number;
  annVol: number;
  sharpe: number;
}

export interface PortfolioPoint {
  return: number;
  volatility: number;
  sharpe: number;
  weights: number[];
}

export interface OptimalPortfolios {
  minVariance: PortfolioPoint;
  maxSharpe: PortfolioPoint;
  equalWeight: PortfolioPoint;
  riskParity: PortfolioPoint;
}

export interface PortfolioOptimizerData {
  symbols: string[];
  assets: AssetInfo[];
  correlation: number[][];
  frontier: PortfolioPoint[];
  optimal: OptimalPortfolios;
  riskFreeRate: number;
}

export function usePortfolioOptimizer(symbols: string[], riskFree = 0.05) {
  const key = [...symbols].sort().join(',');
  return useQuery<PortfolioOptimizerData>({
    queryKey: ['portfolio-optimizer', key, riskFree],
    queryFn: () =>
      api.get<PortfolioOptimizerData>(
        `/portfolio-optimizer?symbols=${encodeURIComponent(key)}&riskFree=${riskFree}`,
      ),
    enabled: symbols.length >= 2,
    staleTime: 60 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}
