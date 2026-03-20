import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ValuationMetrics {
  pe: number | null;
  forwardPE: number | null;
  pb: number | null;
  ps: number | null;
  peg: number | null;
  evEbitda: number | null;
  debtEquity: number | null;
  roe: number | null;
  dividendYield: number | null;
  marketCap: number | null;
}

export interface PeerEntry {
  symbol: string;
  name: string;
  metrics: ValuationMetrics;
}

export interface RelativeValuationData {
  target: {
    symbol: string;
    name: string;
    sector: string;
    metrics: ValuationMetrics;
  };
  peers: PeerEntry[];
  sectorMedians: ValuationMetrics;
}

export function useRelativeValuation(symbol: string) {
  return useQuery<RelativeValuationData>({
    queryKey: ['relative-valuation', symbol],
    queryFn: () => api.get<RelativeValuationData>(`/relative-valuation/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 60 * 60_000,
    refetchInterval: 15 * 60_000,
  });
}
