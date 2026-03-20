import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMoneyMarketMonitor() {
  return useQuery({
    queryKey: ['money-market'],
    queryFn: () => api.get<any>('/money-market'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
