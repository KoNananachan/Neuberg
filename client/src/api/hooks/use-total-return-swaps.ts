import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTotalReturnSwaps() {
  return useQuery({
    queryKey: ['total-return-swaps'],
    queryFn: () => api.get<any>('/total-return-swaps'),
    staleTime: 60 * 60 * 1000,
  });
}
