import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeFinance() {
  return useQuery({
    queryKey: ['trade-finance'],
    queryFn: () => api.get<any>('/trade-finance'),
    staleTime: 60 * 60 * 1000,
  });
}
