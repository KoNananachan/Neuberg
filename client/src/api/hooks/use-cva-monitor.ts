import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCvaMonitor() {
  return useQuery({
    queryKey: ['cva-monitor'],
    queryFn: () => api.get<any>('/cva-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
