import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCriticalMinerals() {
  return useQuery({
    queryKey: ['critical-minerals'],
    queryFn: () => api.get<any>('/critical-minerals'),
    staleTime: 60 * 60 * 1000,
  });
}
