import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface TenorPoint {
  tenor: string;
  yield: number;
  change1d: number;
  change1w: number;
  change1m: number;
}

export interface CurveData {
  id: string;
  name: string;
  currency: string;
  lastUpdated: string;
  tenors: TenorPoint[];
}

export interface CurveSpread {
  type: 'term' | 'cross';
  label: string;
  value: number;
  change1d: number;
  curveA?: string;
  curveB?: string;
}

export interface TermStructureData {
  curves: CurveData[];
  spreads: CurveSpread[];
  generatedAt: string;
}

export function useTermStructure() {
  return useQuery<TermStructureData>({
    queryKey: ['term-structure'],
    queryFn: () => api.get<TermStructureData>('/term-structure'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
