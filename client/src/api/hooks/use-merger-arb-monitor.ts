import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMergerArbMonitor() {
  return useQuery({
    queryKey: ['merger-arb-monitor'],
    queryFn: () => api.get<any>('/merger-arb-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
