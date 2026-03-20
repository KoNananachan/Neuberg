import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeFinance() {
  return useQuery({
    queryKey: ['trade-finance'],
    queryFn: () => api.get<any>('/trade-finance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
