import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useIndexRebalance() {
  return useQuery({
    queryKey: ['index-rebalance'],
    queryFn: () => api.get<any>('/index-rebalance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
