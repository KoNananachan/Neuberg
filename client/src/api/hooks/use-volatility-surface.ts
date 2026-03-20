import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySurface() {
  return useQuery({
    queryKey: ['volatility-surface'],
    queryFn: () => api.get<any>('/volatility-surface'),
    staleTime: 60 * 60 * 1000,
  });
}
