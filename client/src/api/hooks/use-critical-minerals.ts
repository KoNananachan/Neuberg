import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCriticalMinerals() {
  return useQuery({
    queryKey: ['critical-minerals'],
    queryFn: () => api.get<any>('/critical-minerals'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
