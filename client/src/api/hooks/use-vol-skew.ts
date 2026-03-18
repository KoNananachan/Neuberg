import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface SkewPoint {
  delta: number;
  strike: number;
  iv: number;
  moneyness: number;
}

export interface SkewExpiry {
  expiry: string;
  daysToExpiry: number;
  atmIv: number;
  skew25d: number;
  skew10d: number;
  butterfly25d: number;
  riskReversal25d: number;
  points: SkewPoint[];
}

export interface SkewSymbol {
  symbol: string;
  spot: number;
  skewExpiries: SkewExpiry[];
  skewHistory: number[];
  currentSkewPercentile: number;
  signal: string | null;
}

export interface VolSkewResponse {
  data: SkewSymbol;
  availableSymbols: string[];
  timestamp: string;
}

// ── Hook ──

export function useVolSkew(symbol = 'SPY') {
  return useQuery<VolSkewResponse>({
    queryKey: ['vol-skew', symbol],
    queryFn: () => api.get<VolSkewResponse>(`/vol-skew?symbol=${encodeURIComponent(symbol)}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
