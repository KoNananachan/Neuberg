import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCrossCurrencySwaps() {
  return useQuery({
    queryKey: ['cross-currency-swaps'],
    queryFn: () => api.get<any>('/cross-currency-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
