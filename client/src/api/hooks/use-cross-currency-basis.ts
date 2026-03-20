import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossCurrencyBasis() {
  return useQuery({
    queryKey: ['cross-currency-basis'],
    queryFn: () => api.get<any>('/cross-currency-basis'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
