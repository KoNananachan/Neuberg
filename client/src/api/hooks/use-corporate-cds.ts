import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface CorporateCdsEntry {
  entity: string;
  ticker: string;
  sector: string;
  rating: string;
  cds5y: number;
  change1d: number;
  change1w: number;
  change1m: number;
  change3m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  recovery: number;
  impliedPd: number;
  zSpread: number;
  cdsBondBasis: number;
  history: number[];
  signal: string | null;
}

export interface CdsSectorSummary {
  sector: string;
  avgSpread: number;
  change1d: number;
  widest: { entity: string; spread: number };
  tightest: { entity: string; spread: number };
}

export interface CorporateCdsResponse {
  entries: CorporateCdsEntry[];
  sectorSummary: CdsSectorSummary[];
  igIndex: number;
  igIndexChange: number;
  hyIndex: number;
  hyIndexChange: number;
  timestamp: string;
}

// ── Hook ──

export function useCorporateCds() {
  return useQuery({
    queryKey: ['corporate-cds'],
    queryFn: () => api.get<CorporateCdsResponse>('/corporate-cds'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
