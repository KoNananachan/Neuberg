import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeRepository() {
  return useQuery({
    queryKey: ['trade-repository'],
    queryFn: () => api.get<any>('/trade-repository'),
    staleTime: 60 * 60 * 1000,
  });
}
