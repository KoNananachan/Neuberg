import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySkew() {
  return useQuery({
    queryKey: ['volatility-skew'],
    queryFn: () => api.get<any>('/volatility-skew'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
