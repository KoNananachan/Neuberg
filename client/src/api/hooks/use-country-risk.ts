import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface CountryRiskEntry {
  country: string;
  code: string;
  region: string;
  creditRating: string;
  ratingOutlook: string;
  cdsSpread5y: number;
  cdsChange1d: number;
  cdsChange1w: number;
  debtToGdp: number;
  fiscalBalance: number;
  currentAccount: number;
  inflation: number;
  policyRate: number;
  realRate: number;
  gdpGrowth: number;
  fxReserves: number;
  overallRiskScore: number;
  fiscalScore: number;
  externalScore: number;
  politicalScore: number;
  riskTier: string;
  cdsPercentile: number;
  cdsHistory: number[];
  alert: string | null;
}

export interface CountryRiskResponse {
  entries: CountryRiskEntry[];
  globalRiskIndex: number;
  timestamp: string;
}

// ── Hook ──

export function useCountryRisk() {
  return useQuery({
    queryKey: ['country-risk'],
    queryFn: () => api.get<CountryRiskResponse>('/country-risk'),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}
