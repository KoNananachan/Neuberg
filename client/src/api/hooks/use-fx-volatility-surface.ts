import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFxVolatilitySurface() {
  return useQuery({
    queryKey: ['fx-volatility-surface'],
    queryFn: () => api.get<any>('/fx-volatility-surface'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
