import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTradeRecap() {
  return useQuery({
    queryKey: ['trade-recap'],
    queryFn: () => api.get<any>('/trade-recap'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
