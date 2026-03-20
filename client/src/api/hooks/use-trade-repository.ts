import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeRepository() {
  return useQuery({
    queryKey: ['trade-repository'],
    queryFn: () => api.get<any>('/trade-repository'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
