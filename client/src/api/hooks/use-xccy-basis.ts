import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface XccyBasisEntry {
  pair: string;
  tenor: string;
  basisSpread: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  spotRate: number;
  forwardPoints: number;
  impliedYield: number;
  usdLibor: number;
  foreignRate: number;
  signal: string | null;
  history: number[];
}

export interface XccyBasisData {
  entries: XccyBasisEntry[];
  stressIndex: number;
  termStructure: {
    tenors: string[];
    spreads: number[];
  };
  timestamp: string;
}

export function useXccyBasis() {
  return useQuery<XccyBasisData>({
    queryKey: ['xccy-basis'],
    queryFn: () => api.get<XccyBasisData>('/xccy-basis'),
    staleTime: 2 * 60_000,
  });
}
