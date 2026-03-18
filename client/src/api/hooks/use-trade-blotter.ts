import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTradeBlotter() {
  return useQuery({
    queryKey: ['trade-blotter'],
    queryFn: () => api.get<any>('/trade-blotter'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
