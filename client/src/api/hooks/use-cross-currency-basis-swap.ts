import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCrossCurrencyBasisSwap() {
  return useQuery({
    queryKey: ['cross-currency-basis-swap'],
    queryFn: () => api.get<any>('/cross-currency-basis-swap'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
