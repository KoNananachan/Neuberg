import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMergerArbitrage() {
  return useQuery({
    queryKey: ['merger-arbitrage'],
    queryFn: () => api.get<any>('/merger-arbitrage'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
