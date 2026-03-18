import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface GexStrike {
  strike: number;
  callGamma: number;
  putGamma: number;
  netGamma: number;
  callOI: number;
  putOI: number;
  totalOI: number;
}

export interface KeyLevel {
  price: number;
  type: string;
  description: string;
}

export interface GexSummary {
  symbol: string;
  spot: number;
  totalNetGamma: number;
  gammaFlip: number;
  maxGammaStrike: number;
  zeroDteGamma: number;
  putWall: number;
  callWall: number;
  gammaRegime: string;
  expectedMoveUp: number;
  expectedMoveDown: number;
  keyLevels: KeyLevel[];
  gammaHistory: number[];
}

export interface GammaExposureResponse {
  strikes: GexStrike[];
  summary: GexSummary;
  availableSymbols: string[];
  timestamp: string;
}

// ── Hook ──

export function useGammaExposure(symbol = 'SPY') {
  return useQuery<GammaExposureResponse>({
    queryKey: ['gamma-exposure', symbol],
    queryFn: () => api.get<GammaExposureResponse>(`/gamma-exposure?symbol=${encodeURIComponent(symbol)}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
