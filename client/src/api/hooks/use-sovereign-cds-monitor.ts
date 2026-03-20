import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignCdsMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sovereign-cds-monitor'],
    queryFn: () => api.get<any>('/sovereign-cds-monitor'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
