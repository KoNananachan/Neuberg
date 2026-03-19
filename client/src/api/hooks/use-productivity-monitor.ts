import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useProductivityMonitor() {
  return useQuery({
    queryKey: ['productivity-monitor'],
    queryFn: () => api.get<any>('/productivity-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
