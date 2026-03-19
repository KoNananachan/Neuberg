import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalTaxRates() {
  return useQuery({
    queryKey: ['global-tax-rates'],
    queryFn: () => api.get<any>('/global-tax-rates'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
