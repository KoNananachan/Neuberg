import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface IssuerRating {
  name: string;
  type: 'sovereign' | 'corporate';
  sector: string;
  ratings: { sp: string; moodys: string; fitch: string };
  outlook: { sp: string; moodys: string; fitch: string };
  lastAction: {
    agency: string;
    date: string;
    action: string;
    from: string;
    to: string;
  };
  debtToGdp: number | null;
  debtToEbitda: number | null;
  spreadBps: number;
  cdsSpread: number;
  defaultProbability1Y: number;
}

export interface RatingAction {
  date: string;
  issuer: string;
  agency: string;
  action: string;
  from: string;
  to: string;
  rationale: string;
}

export interface CreditRatingsResponse {
  issuers: IssuerRating[];
  recentActions: RatingAction[];
  generatedAt: string;
}

// ── Hook ──

export function useCreditRatings() {
  return useQuery({
    queryKey: ['credit-ratings'],
    queryFn: () => api.get<CreditRatingsResponse>('/credit-ratings'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
