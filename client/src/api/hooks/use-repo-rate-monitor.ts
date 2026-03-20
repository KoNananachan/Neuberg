import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useRepoRateMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['repo-rate-monitor'],
    queryFn: () => api.get<any>('/repo-rate-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
