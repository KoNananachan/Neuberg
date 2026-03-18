import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface VolTermStructureSpot {
  vix: number;
  vix3m: number | null;
  vix6m: number | null;
  changePct: number;
  regime: 'low' | 'normal' | 'elevated' | 'high' | 'extreme';
  percentile60d: number;
}

export interface TermStructureShape {
  shape: 'contango' | 'backwardation' | 'flat';
  spread: number;
  ratio: number;
  steepness: number;
}

export interface RealizedVsImplied {
  impliedVol: number;
  realizedVol20d: number;
  spread: number;
  premium: 'high' | 'normal' | 'low';
}

export interface VolSignals {
  spikeRisk: 'low' | 'moderate' | 'high';
  meanReversion: 'overbought' | 'neutral' | 'oversold';
  vixSma20: number;
  vixSma20Deviation: number;
}

export interface VolProduct {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  description: string;
}

export interface VolHistoryPoint {
  date: string;
  vix: number;
  vix3m: number | null;
  realizedVol: number;
  spxClose: number;
}

export interface VolTermStructureData {
  timestamp: string;
  spot: VolTermStructureSpot;
  termStructure: TermStructureShape;
  realizedVsImplied: RealizedVsImplied;
  signals: VolSignals;
  products: VolProduct[];
  history: VolHistoryPoint[];
}

export function useVolTermStructure() {
  return useQuery({
    queryKey: ['vol-term-structure'],
    queryFn: () => api.get<VolTermStructureData>('/vol-term-structure'),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });
}
