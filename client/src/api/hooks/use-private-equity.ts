import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function usePrivateEquity() {
  return useQuery({
    queryKey: ['private-equity'],
    queryFn: () => api.get<any>('/private-equity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
