import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeSettlement() {
  return useQuery({
    queryKey: ['trade-settlement'],
    queryFn: () => api.get<any>('/trade-settlement'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
