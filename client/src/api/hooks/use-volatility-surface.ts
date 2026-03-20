import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySurface() {
  return useQuery({
    queryKey: ['volatility-surface'],
    queryFn: () => api.get<any>('/volatility-surface'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
