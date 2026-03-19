import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVarianceSwapMonitor() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['variance-swap-monitor'],
    queryFn: () => api.get<any>('/variance-swap-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
