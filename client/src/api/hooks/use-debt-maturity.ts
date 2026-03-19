import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDebtMaturity() {
  return useQuery({
    queryKey: ['debt-maturity'],
    queryFn: () => api.get<any>('/debt-maturity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
