import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSwapCurveMonitor() {
  return useQuery({
    queryKey: ['swap-curve-monitor'],
    queryFn: () => api.get<any>('/swap-curve-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
