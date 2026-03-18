import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface LiquidityIndicator {
  name: string;
  symbol: string;
  category: 'equity' | 'bond' | 'fx' | 'volatility' | 'money_market';
  volumeRatio: number;
  spreadProxy: number;
  realizedVol5d: number;
  volumeTrend: 'rising' | 'stable' | 'falling';
  liquidityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  sparklineVolume: number[];
  sparklineSpread: number[];
}

export interface LiquidityCrossMarket {
  equityLiquidity: number;
  bondLiquidity: number;
  fxLiquidity: number;
  moneyMarket: number;
}

export interface LiquidityHistoryPoint {
  date: string;
  composite: number;
  equity: number;
  bond: number;
}

export interface LiquidityData {
  timestamp: string;
  compositeScore: number;
  level: 'abundant' | 'normal' | 'tightening' | 'stressed' | 'crisis';
  indicators: LiquidityIndicator[];
  crossMarket: LiquidityCrossMarket;
  history: LiquidityHistoryPoint[];
  alerts: string[];
}

export function useLiquidity() {
  return useQuery<LiquidityData>({
    queryKey: ['liquidity'],
    queryFn: () => api.get<LiquidityData>('/liquidity'),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 3 * 60 * 1000,
  });
}
