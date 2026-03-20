import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCriticalMinerals() {
  return useQuery({
    queryKey: ['critical-minerals'],
    queryFn: () => api.get<any>('/critical-minerals'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
