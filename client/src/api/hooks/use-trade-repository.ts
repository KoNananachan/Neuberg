import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeRepository() {
  return useQuery({
    queryKey: ['trade-repository'],
    queryFn: () => api.get<any>('/trade-repository'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
