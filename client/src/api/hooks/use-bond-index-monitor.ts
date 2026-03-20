import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBondIndexMonitor() {
  return useQuery({
    queryKey: ['bond-index-monitor'],
    queryFn: () => api.get<any>('/bond-index-monitor'),
    staleTime: 180000,
  });
}
