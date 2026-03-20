import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalTaxRates() {
  return useQuery({
    queryKey: ['global-tax-rates'],
    queryFn: () => api.get<any>('/global-tax-rates'),
    staleTime: 60 * 60 * 1000,
  });
}
