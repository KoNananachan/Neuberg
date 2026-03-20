import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useIndexArbitrage() {
  return useQuery({
    queryKey: ['index-arbitrage'],
    queryFn: () => api.get<any>('/index-arbitrage'),
    staleTime: 60 * 60 * 1000,
  });
}
