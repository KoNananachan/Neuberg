import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePrivateEquity() {
  return useQuery({
    queryKey: ['private-equity'],
    queryFn: () => api.get<any>('/private-equity'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
