import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMergerArbMonitor() {
  return useQuery({
    queryKey: ['merger-arb-monitor'],
    queryFn: () => api.get<any>('/merger-arb-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
