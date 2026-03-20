import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeBalance() {
  return useQuery({
    queryKey: ['trade-balance'],
    queryFn: () => api.get<any>('/trade-balance'),
    staleTime: 60 * 60 * 1000,
  });
}
