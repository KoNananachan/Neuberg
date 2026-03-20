import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritiesValuation() {
  return useQuery({
    queryKey: ['securities-valuation'],
    queryFn: () => api.get<any>('/securities-valuation'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
