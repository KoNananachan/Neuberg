import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFxVolatility() {
  return useQuery({
    queryKey: ['fx-volatility'],
    queryFn: () => api.get<any>('/fx-volatility'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
