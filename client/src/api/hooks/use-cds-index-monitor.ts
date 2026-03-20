import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCdsIndexMonitor() {
  return useQuery({
    queryKey: ['cds-index-monitor'],
    queryFn: () => api.get<any>('/cds-index-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
