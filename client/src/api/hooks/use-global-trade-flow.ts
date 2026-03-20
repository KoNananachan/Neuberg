import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalTradeFlow() {
  return useQuery({
    queryKey: ['global-trade-flow'],
    queryFn: () => api.get<any>('/global-trade-flow'),
    staleTime: 60 * 60 * 1000,
  });
}
