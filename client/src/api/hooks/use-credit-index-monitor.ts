import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditIndexMonitor() {
  return useQuery({
    queryKey: ['credit-index-monitor'],
    queryFn: () => api.get<any>('/credit-index-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
