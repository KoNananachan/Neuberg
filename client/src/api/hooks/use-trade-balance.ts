import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeBalance() {
  return useQuery({
    queryKey: ['trade-balance'],
    queryFn: () => api.get<any>('/trade-balance'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
