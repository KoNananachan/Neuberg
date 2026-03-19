import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFinancialConditions() {
  return useQuery({
    queryKey: ['financial-conditions'],
    queryFn: () => api.get<any>('/financial-conditions'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
