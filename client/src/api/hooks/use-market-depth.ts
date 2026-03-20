import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMarketDepth() {
  return useQuery({
    queryKey: ['market-depth'],
    queryFn: () => api.get<any>('/market-depth'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
