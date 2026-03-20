import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeBalance() {
  return useQuery({
    queryKey: ['trade-balance'],
    queryFn: () => api.get<any>('/trade-balance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
