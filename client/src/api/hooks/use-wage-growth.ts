import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWageGrowth() {
  return useQuery({
    queryKey: ['wage-growth'],
    queryFn: () => api.get<any>('/wage-growth'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
