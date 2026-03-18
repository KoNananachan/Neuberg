import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritiesValuation() {
  return useQuery({
    queryKey: ['securities-valuation'],
    queryFn: () => api.get<any>('/securities-valuation'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
