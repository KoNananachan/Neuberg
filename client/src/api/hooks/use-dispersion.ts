import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface DispersionStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  beta: number;
  realizedVol: number;
  corrToIndex: number;
  trackingError: number;
  returns5d: number;
  sparkline: number[];
}

export interface CorrelationMatrix {
  symbols: string[];
  values: number[][];
}

export interface DispersionHistory {
  date: string;
  avgCorrelation: number;
  dispersionRatio: number;
}

export interface DispersionData {
  timestamp: string;
  avgCorrelation20d: number;
  avgCorrelation60d: number;
  dispersionRatio: number;
  indexVol20d: number;
  avgStockVol20d: number;
  concentrationPct: number;
  level: 'high_corr' | 'normal' | 'high_dispersion';
  stocks: DispersionStock[];
  correlationMatrix: CorrelationMatrix;
  history: DispersionHistory[];
}

export function useDispersion() {
  return useQuery<DispersionData>({
    queryKey: ['dispersion'],
    queryFn: () => api.get<DispersionData>('/dispersion'),
    staleTime: 3 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
