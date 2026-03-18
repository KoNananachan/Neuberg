import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FXRate {
  code: string;
  name: string;
  flag: string;
  rateToUSD: number;
}

export function useFXRates() {
  return useQuery({
    queryKey: ['fx-converter', 'rates'],
    queryFn: () => api.get<FXRate[]>('/fx-rates'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
