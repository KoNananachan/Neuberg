import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMergerArbitrage() {
  return useQuery({
    queryKey: ['merger-arbitrage'],
    queryFn: () => api.get<any>('/merger-arbitrage'),
    staleTime: 60 * 60 * 1000,
  });
}
