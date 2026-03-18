import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMbsAnalytics() {
  return useQuery({
    queryKey: ['mbs-analytics'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/mbs-analytics'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
