import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFinancialConditions() {
  return useQuery({
    queryKey: ['financial-conditions'],
    queryFn: () => api.get<any>('/financial-conditions'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
