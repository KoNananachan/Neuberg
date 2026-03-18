import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useIndexArbitrage() {
  return useQuery({
    queryKey: ['index-arbitrage'],
    queryFn: () => api.get<any>('/index-arbitrage'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
