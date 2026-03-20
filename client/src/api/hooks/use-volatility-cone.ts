import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface ConeWindow {
  period: string;
  current: number;
  min: number;
  p10: number;
  p25: number;
  median: number;
  p75: number;
  p90: number;
  max: number;
  percentileRank: number;
}

export interface ConeAsset {
  ticker: string;
  name: string;
  windows: ConeWindow[];
  impliedVol: number;
  rvIvSpread: number;
  regime: 'Low' | 'Normal' | 'Elevated' | 'High' | 'Extreme';
}

export interface VolatilityConeResponse {
  data: ConeAsset[];
  generatedAt: string;
}

// ── Hook ──

export function useVolatilityCone() {
  return useQuery<VolatilityConeResponse>({
    queryKey: ['volatility-cone'],
    queryFn: () => api.get<VolatilityConeResponse>('/volatility-cone'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
