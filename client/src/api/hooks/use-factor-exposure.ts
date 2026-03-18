import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type FactorSignal = 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
export type RegimeStyle = 'value' | 'growth' | 'quality' | 'momentum' | 'mixed';

export interface Factor {
  name: string;
  symbol: string;
  pairSymbol: string | null;
  return5d: number;
  return20d: number;
  return60d: number;
  volatility20d: number;
  sharpe20d: number;
  zScore: number;
  relativeStrength: number;
  corrToMarket: number;
  signal: FactorSignal;
  sparkline: number[];
}

export interface FactorRegime {
  dominantFactor: string;
  style: RegimeStyle;
  description: string;
}

export interface FactorCorrelationMatrix {
  names: string[];
  values: number[][];
}

export interface FactorExposureData {
  timestamp: string;
  factors: Factor[];
  regime: FactorRegime;
  factorCorrelationMatrix: FactorCorrelationMatrix;
}

export function useFactorExposure() {
  return useQuery({
    queryKey: ['factor-exposure'],
    queryFn: () => api.get<FactorExposureData>('/factor-exposure'),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}
