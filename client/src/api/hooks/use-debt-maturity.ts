import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDebtMaturity() {
  return useQuery({
    queryKey: ['debt-maturity'],
    queryFn: () => api.get<any>('/debt-maturity'),
    staleTime: 60 * 60 * 1000,
  });
}
