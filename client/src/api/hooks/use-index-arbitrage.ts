import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useIndexArbitrage() {
  return useQuery({
    queryKey: ['index-arbitrage'],
    queryFn: () => api.get<any>('/index-arbitrage'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
