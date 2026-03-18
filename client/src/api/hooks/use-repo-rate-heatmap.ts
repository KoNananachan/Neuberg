import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface HeatmapCell {
  term: string;
  collateral: string;
  rate: number;
  change1d: number;
}

export interface SpecialRate {
  cusip: string;
  security: string;
  maturity: string;
  specialRate: number;
  gcRate: number;
  spread: number;
  failsAmount: number;
}

export interface TripartySummary {
  totalVolume: number;
  avgRate: number;
  concentration: number;
  clearedPct: number;
}

export interface FailsData {
  date: string;
  amount: number;
  rollingAvg: number;
  settlementEfficiency: number;
}

export interface RepoRateHeatmapData {
  timestamp: string;
  terms: string[];
  collateralTypes: string[];
  heatmap: HeatmapCell[];
  specials: SpecialRate[];
  triparty: TripartySummary;
  fails: FailsData[];
}

export function useRepoRateHeatmap() {
  return useQuery<RepoRateHeatmapData>({
    queryKey: ['repo-rate-heatmap'],
    queryFn: () => api.get<RepoRateHeatmapData>('/repo-rate-heatmap'),
    staleTime: 2 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
