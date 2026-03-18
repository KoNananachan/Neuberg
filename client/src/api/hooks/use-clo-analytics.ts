import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCloAnalytics() {
  return useQuery({
    queryKey: ['clo-analytics'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/clo-analytics'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
