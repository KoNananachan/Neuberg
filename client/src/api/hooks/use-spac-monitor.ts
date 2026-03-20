import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSpacMonitor() {
  return useQuery({
    queryKey: ['spac-monitor'],
    queryFn: () => api.get<any>('/spac-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
