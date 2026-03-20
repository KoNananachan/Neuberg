import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTreasuryAnalytics() {
  return useQuery({
    queryKey: ['treasury-analytics'],
    queryFn: () => api.get<any>('/treasury-analytics'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
