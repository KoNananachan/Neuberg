import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCdsMonitor() {
  return useQuery({
    queryKey: ['cds-monitor'],
    queryFn: () => api.get<any>('/cds-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
