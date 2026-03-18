import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwapCurveMonitor() {
  return useQuery({
    queryKey: ['swap-curve-monitor'],
    queryFn: () => api.get<any>('/swap-curve-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
