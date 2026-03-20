import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTradeSettlement() {
  return useQuery({
    queryKey: ['trade-settlement'],
    queryFn: () => api.get<any>('/trade-settlement'),
    staleTime: 60 * 60 * 1000,
  });
}
