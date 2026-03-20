import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSecuritiesValuation() {
  return useQuery({
    queryKey: ['securities-valuation'],
    queryFn: () => api.get<any>('/securities-valuation'),
    staleTime: 60 * 60 * 1000,
  });
}
