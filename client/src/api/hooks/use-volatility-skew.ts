import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySkew() {
  return useQuery({
    queryKey: ['volatility-skew'],
    queryFn: () => api.get<any>('/volatility-skew'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
