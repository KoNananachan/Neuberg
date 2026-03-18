import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface DividendQuarterHistory {
  date: string;
  amount: number;
  yieldAtDate: number;
}

export interface DividendForecastStock {
  ticker: string;
  name: string;
  sector: string;
  currentPrice: number;
  annualDividend: number;
  forwardYield: number;
  trailingYield: number;
  payoutRatio: number;
  dividendGrowth5Y: number;
  dividendGrowth1Y: number;
  consecutiveYears: number;
  nextExDate: string;
  nextPayDate: string;
  frequency: 'quarterly' | 'monthly' | 'semi-annual';
  safetyScore: number;
  rating: 'Strong Buy' | 'Buy' | 'Hold' | 'Cut Risk';
  history: DividendQuarterHistory[];
}

export interface DividendForecastResponse {
  data: DividendForecastStock[];
  generatedAt: string;
}

export function useDividendForecast() {
  return useQuery<DividendForecastResponse>({
    queryKey: ['dividend-forecast'],
    queryFn: () => api.get<DividendForecastResponse>('/dividend-forecast'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
