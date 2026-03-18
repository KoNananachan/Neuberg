import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVolatilitySmile() {
  return useQuery({
    queryKey: ['volatility-smile'],
    queryFn: () => api.get<any>('/volatility-smile'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
