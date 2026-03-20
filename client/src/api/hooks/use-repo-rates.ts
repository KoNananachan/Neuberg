import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface RepoRate {
  name: string;
  category: 'secured' | 'unsecured' | 'treasury' | 'term' | 'commercial_paper';
  rate: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  volume: number | null;
  rateHistory: number[];
  spreadToFedFunds: number;
  signal: 'TIGHTENING' | 'EASING' | 'STRESS' | 'FLOOR' | null;
}

export interface FedFacility {
  name: string;
  usage: number;
  usageChange: number;
  counterparties: number;
  awardRate: number;
  usageHistory: number[];
}

export interface RepoRatesData {
  rates: RepoRate[];
  facilities: FedFacility[];
  fedTargetLower: number;
  fedTargetUpper: number;
  nextFomcDate: string;
  marketImpliedRate: number;
  timestamp: string;
}

export function useRepoRates() {
  return useQuery<RepoRatesData>({
    queryKey: ['repo-rates'],
    queryFn: () => api.get<RepoRatesData>('/repo-rates'),
    refetchInterval: 30 * 60_000,
    staleTime: 2 * 60_000,
  });
}
