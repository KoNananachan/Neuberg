import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface AssetRegime {
  symbol: string;
  name: string;
  price: number;
  trend: 'Bull' | 'Bear' | 'Correction' | 'Recovery';
  trendStrength: number;
  rsi: number;
  volatility: number;
  sma20: number;
  sma50: number;
  sma200: number;
  returns: { '1w': number; '1m': number; '3m': number };
  category: string;
}

export interface MarketRegimeData {
  regime: 'RISK ON' | 'RISK OFF' | 'TRANSITION' | 'MIXED';
  regimeScore: number;
  assets: AssetRegime[];
  updatedAt: string;
}

export function useMarketRegime() {
  return useQuery({
    queryKey: ['market-regime'],
    queryFn: () => api.get<MarketRegimeData>('/market-regime'),
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    staleTime: 8 * 60 * 1000, // 8 minutes
  });
}
