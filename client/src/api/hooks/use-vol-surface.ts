import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface SurfacePoint {
  expiry: string;
  strike: number;
  moneyness: number;
  iv: number;
  delta: number;
  gamma: number;
  vega: number;
  theta: number;
}

export interface TermStructureEntry {
  expiry: string;
  daysToExpiry: number;
  atmIv: number;
  skew: number;
  butterfly: number;
}

export interface SmileMetrics {
  skewSlope: number;
  convexity: number;
  putCallSkew: number;
  wingSlope: number;
}

export interface VolSurfaceData {
  ticker: string;
  spotPrice: number;
  lastUpdated: string;
  surface: SurfacePoint[];
  atmIv: number;
  skew25d: number;
  butterfly25d: number;
  rvIvRatio: number;
  termStructure: TermStructureEntry[];
  smileMetrics: SmileMetrics;
}

export interface VolSurfaceResponse {
  surfaces: VolSurfaceData[];
  generatedAt: string;
}

// ── Hook ──

export function useVolSurface() {
  return useQuery<VolSurfaceResponse>({
    queryKey: ['vol-surface'],
    queryFn: () => api.get<VolSurfaceResponse>('/vol-surface'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
