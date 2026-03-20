import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDividendCapture() {
  return useQuery({
    queryKey: ['dividend-capture'],
    queryFn: () => api.get<any>('/dividend-capture'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
