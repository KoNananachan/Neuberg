import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTradeCompression() {
  return useQuery({
    queryKey: ['trade-compression'],
    queryFn: () => api.get<any>('/trade-compression'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
