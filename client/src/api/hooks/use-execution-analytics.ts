import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useExecutionAnalytics() {
  return useQuery({
    queryKey: ['execution-analytics'],
    queryFn: () => api.get<any>('/execution-analytics'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
