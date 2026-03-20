import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityBasketSwaps() {
  return useQuery({
    queryKey: ['equity-basket-swaps'],
    queryFn: () => api.get<any>('/equity-basket-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
