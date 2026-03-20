import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossCurrencyBasis() {
  return useQuery({
    queryKey: ['cross-currency-basis'],
    queryFn: () => api.get<any>('/cross-currency-basis'),
    staleTime: 60 * 60 * 1000,
  });
}
