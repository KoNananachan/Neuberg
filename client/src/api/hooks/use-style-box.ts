import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface StyleCell {
  style: string;
  label: string;
  etf: string;
  etfName: string;
  return1d: number;
  return1w: number;
  return1m: number;
  return3m: number;
  returnYtd: number;
  return1y: number;
  peRatio: number;
  pbRatio: number;
  dividendYield: number;
  avgMarketCap: number;
  flow1m: number;
  relativeStrength: number;
  momentum: number;
  history: number[];
}

export interface RotationSignal {
  from: string;
  to: string;
  strength: number;
  description: string;
}

export interface StyleBoxResponse {
  cells: StyleCell[];
  rotation: RotationSignal[];
  bestStyle: string;
  worstStyle: string;
  valueVsGrowth: number;
  smallVsLarge: number;
  timestamp: string;
}

export function useStyleBox() {
  return useQuery<StyleBoxResponse>({
    queryKey: ['style-box'],
    queryFn: () => api.get('/style-box'),
    staleTime: 2 * 60_000,
  });
}
