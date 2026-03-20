import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface SkewPoint {
  strike: number;
  moneyness: number;
  callIV: number | null;
  putIV: number | null;
}

export interface ExpirationData {
  date: string;
  daysToExpiry: number;
  atmIV: number | null;
  skew: SkewPoint[];
}

export interface TermStructurePoint {
  daysToExpiry: number;
  atmIV: number;
}

export interface IVSurfaceData {
  symbol: string;
  spotPrice: number;
  atmIV: number | null;
  ivPercentile: number;
  historicalVol: number | null;
  expirations: ExpirationData[];
  termStructure: TermStructurePoint[];
}

export function useIVSurface(symbol: string) {
  return useQuery<IVSurfaceData>({
    queryKey: ['iv-surface', symbol],
    queryFn: () => api.get<IVSurfaceData>(`/iv-surface/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
  });
}
