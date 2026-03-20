import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFixedIncomeAnalytics() {
  return useQuery({
    queryKey: ['fixed-income-analytics'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/fixed-income-analytics'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
