import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useVolatilitySkew() {
  return useQuery({
    queryKey: ['volatility-skew'],
    queryFn: () => api.get<any>('/volatility-skew'),
    staleTime: 60 * 60 * 1000,
  });
}
