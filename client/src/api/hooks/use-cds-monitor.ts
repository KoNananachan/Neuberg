import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCdsMonitor() {
  return useQuery({
    queryKey: ['cds-monitor'],
    queryFn: () => api.get<any>('/cds-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
