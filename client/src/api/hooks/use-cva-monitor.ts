import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCvaMonitor() {
  return useQuery({
    queryKey: ['cva-monitor'],
    queryFn: () => api.get<any>('/cva-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
