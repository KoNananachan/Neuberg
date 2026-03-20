import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTreasuryAnalytics() {
  return useQuery({
    queryKey: ['treasury-analytics'],
    queryFn: () => api.get<any>('/treasury-analytics'),
    staleTime: 60 * 60 * 1000,
  });
}
