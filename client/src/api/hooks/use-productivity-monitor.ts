import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useProductivityMonitor() {
  return useQuery({
    queryKey: ['productivity-monitor'],
    queryFn: () => api.get<any>('/productivity-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
