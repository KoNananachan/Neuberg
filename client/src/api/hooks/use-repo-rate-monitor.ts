import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRepoRateMonitor() {
  return useQuery({
    queryKey: ['repo-rate-monitor'],
    queryFn: () => api.get<any>('/repo-rate-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
