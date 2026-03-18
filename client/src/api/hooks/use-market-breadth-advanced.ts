import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMarketBreadthAdvanced() {
  return useQuery({
    queryKey: ['market-breadth-advanced'],
    queryFn: () => api.get<any>('/market-breadth-advanced'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
