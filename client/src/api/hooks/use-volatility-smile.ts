import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useVolatilitySmile() {
  return useQuery({
    queryKey: ['volatility-smile'],
    queryFn: () => api.get<any>('/volatility-smile'),
    staleTime: 60 * 60 * 1000,
  });
}
