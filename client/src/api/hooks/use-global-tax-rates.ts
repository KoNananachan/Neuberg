import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalTaxRates() {
  return useQuery({
    queryKey: ['global-tax-rates'],
    queryFn: () => api.get<any>('/global-tax-rates'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
