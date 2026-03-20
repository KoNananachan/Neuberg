import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFinancialConditions() {
  return useQuery({
    queryKey: ['financial-conditions'],
    queryFn: () => api.get<any>('/financial-conditions'),
    staleTime: 60 * 60 * 1000,
  });
}
