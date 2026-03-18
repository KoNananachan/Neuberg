import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CountryRate {
  country: string;
  code: string;
  region: 'Americas' | 'Europe' | 'Asia Pacific' | 'Emerging';
  policyRate: number;
  overnight: number;
  rate2y: number;
  rate5y: number;
  rate10y: number;
  rate30y: number;
  spread2s10s: number;
  change10y1d: number;
  change10y1w: number;
  change10y1m: number;
  realRate10y: number;
  inflation: number;
  history10y: number[];
}

export interface RateSpreadPair {
  name: string;
  spread: number;
  change1d: number;
  change1w: number;
  history: number[];
}

export interface GlobalRatesData {
  countries: CountryRate[];
  spreads: RateSpreadPair[];
  globalAvg10y: number;
  timestamp: string;
}

export function useGlobalRates() {
  return useQuery<GlobalRatesData>({
    queryKey: ['global-rates'],
    queryFn: () => api.get<GlobalRatesData>('/global-rates'),
    staleTime: 1 * 60_000,
    refetchInterval: 2 * 60_000,
  });
}
