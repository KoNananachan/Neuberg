import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignCdsMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sovereign-cds-monitor'],
    queryFn: () => api.get<any>('/sovereign-cds-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
