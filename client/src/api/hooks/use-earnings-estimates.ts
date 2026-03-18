import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface EstimatePeriod {
  avg: number | null;
  low: number | null;
  high: number | null;
  numAnalysts: number | null;
  growth: number | null;
}

export interface RevisionPeriod {
  current: number | null;
  sevenDaysAgo: number | null;
  thirtyDaysAgo: number | null;
  sixtyDaysAgo: number | null;
  ninetyDaysAgo: number | null;
}

export interface EarningsHistoryEntry {
  quarter: string;
  date: string;
  epsEstimate: number | null;
  epsActual: number | null;
  surprise: number | null;
  surprisePct: number | null;
}

export interface EarningsEstimatesData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  eps: {
    ttm: number | null;
    forward: number | null;
    currentYear: number | null;
    nextYear: number | null;
  };
  pe: {
    trailing: number | null;
    forward: number | null;
  };
  revenue: {
    ttm: number | null;
    growth: number | null;
  };
  earningsHistory: EarningsHistoryEntry[];
  estimates: {
    currentQuarter: EstimatePeriod | null;
    nextQuarter: EstimatePeriod | null;
    currentYear: EstimatePeriod | null;
    nextYear: EstimatePeriod | null;
  };
  revisions: {
    currentQuarter: RevisionPeriod | null;
    nextQuarter: RevisionPeriod | null;
    currentYear: RevisionPeriod | null;
    nextYear: RevisionPeriod | null;
  };
  nextEarningsDate: string | null;
  updatedAt: string;
}

export function useEarningsEstimates(symbol: string | null) {
  return useQuery<EarningsEstimatesData>({
    queryKey: ['earnings-estimates', symbol],
    queryFn: () => api.get(`/earnings-estimates/${symbol}`),
    enabled: !!symbol && symbol.length > 0,
    refetchInterval: 900_000, // 15 min
    staleTime: 600_000, // 10 min
  });
}
