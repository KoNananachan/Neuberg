import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalTradeFlow() {
  return useQuery({
    queryKey: ['global-trade-flow'],
    queryFn: () => api.get<any>('/global-trade-flow'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
