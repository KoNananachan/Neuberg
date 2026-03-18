import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface RevisionEntry {
  symbol: string;
  name: string;
  sector: string;
  currentQEps: number;
  currentQRevision1m: number;
  currentQRevision3m: number;
  currentQUpRevisions: number;
  currentQDownRevisions: number;
  currentQRevisionRatio: number;
  nextQEps: number;
  nextQRevision1m: number;
  nextQRevision3m: number;
  fyEps: number;
  fyRevision1m: number;
  fyRevision3m: number;
  fyUpRevisions: number;
  fyDownRevisions: number;
  fyRevenue: number;
  fyRevenueRevision1m: number;
  revisionMomentum: number;
  earningsYield: number;
  peRatio: number;
  revisionHistory: number[];
  signal: string | null;
}

export interface SectorRevision {
  sector: string;
  avgRevision1m: number;
  avgRevision3m: number;
  upgrades: number;
  downgrades: number;
  ratio: number;
  momentum: number;
}

export interface EarningsRevisionsData {
  entries: RevisionEntry[];
  sectorRevisions: SectorRevision[];
  marketRevision: number;
  breadth: number;
  timestamp: string;
}

export function useEarningsRevisions() {
  return useQuery<EarningsRevisionsData>({
    queryKey: ['earnings-revisions'],
    queryFn: () => api.get('/earnings-revisions'),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
