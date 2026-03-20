import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useProductivityMonitor() {
  return useQuery({
    queryKey: ['productivity-monitor'],
    queryFn: () => api.get<any>('/productivity-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
