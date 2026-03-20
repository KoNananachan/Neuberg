import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalIndexMonitor() {
  return useQuery({
    queryKey: ['global-index-monitor'],
    queryFn: () => api.get<any>('/global-index-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
