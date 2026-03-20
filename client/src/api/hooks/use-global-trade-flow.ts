import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalTradeFlow() {
  return useQuery({
    queryKey: ['global-trade-flow'],
    queryFn: () => api.get<any>('/global-trade-flow'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
