import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface RatingBreakdown {
  aaa_aa: number;
  a: number;
  bbb: number;
  highYield: number;
}

export interface MaturityBucket {
  year: number;
  amount: number;
  count: number;
  avgCoupon: number;
  avgYield: number;
  ratingBreakdown: RatingBreakdown;
  refinancingRisk: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface EntityProfile {
  entity: string;
  label: string;
  totalOutstanding: number;
  avgMaturity: number;
  avgCoupon: number;
  avgYield: number;
  nearTermMaturities: number;
  wallYear: number;
  wallAmount: number;
}

export interface DebtMaturityResponse {
  buckets: MaturityBucket[];
  profile: EntityProfile;
  entities: string[];
  refinancingCost: number;
  timestamp: string;
}

export function useDebtMaturity(entity = 'US_IG') {
  return useQuery<DebtMaturityResponse>({
    queryKey: ['debt-maturity', entity],
    queryFn: () => api.get<DebtMaturityResponse>(`/debt-maturity?entity=${encodeURIComponent(entity)}`),
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });
}
