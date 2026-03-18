import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface YieldPoint {
  term: string;
  yield: number;
  months: number;
  isLive: boolean;
}

export interface YieldCurveData {
  maturities: YieldPoint[];
  updatedAt: string;
}

export interface HistoricalCurve {
  date: string;
  points: { term: string; yield: number; months: number }[];
}

export interface YieldCurveHistoryData {
  curves: HistoricalCurve[];
}

export function useYieldCurve() {
  return useQuery({
    queryKey: ['yield-curve'],
    queryFn: () => api.get<YieldCurveData>('/yield-curve'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}

export function useYieldCurveHistory() {
  return useQuery({
    queryKey: ['yield-curve-history'],
    queryFn: () => api.get<YieldCurveHistoryData>('/yield-curve/history'),
    staleTime: 30 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}
