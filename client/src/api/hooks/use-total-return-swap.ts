import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTotalReturnSwap() {
  return useQuery({
    queryKey: ['total-return-swap'],
    queryFn: () => api.get<any>('/total-return-swap'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
