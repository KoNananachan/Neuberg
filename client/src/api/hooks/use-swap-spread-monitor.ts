import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwapSpreadMonitor() {
  return useQuery({
    queryKey: ['swap-spread-monitor'],
    queryFn: () => api.get<any>('/swap-spread-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
