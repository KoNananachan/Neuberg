import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useWageGrowth() {
  return useQuery({
    queryKey: ['wage-growth'],
    queryFn: () => api.get<any>('/wage-growth'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
