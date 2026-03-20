import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePrivateEquity() {
  return useQuery({
    queryKey: ['private-equity'],
    queryFn: () => api.get<any>('/private-equity'),
    staleTime: 60 * 60 * 1000,
  });
}
