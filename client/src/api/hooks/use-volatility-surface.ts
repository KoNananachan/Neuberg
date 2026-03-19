import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySurface() {
  return useQuery({
    queryKey: ['volatility-surface'],
    queryFn: () => api.get<any>('/volatility-surface'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
