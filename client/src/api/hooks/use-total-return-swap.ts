import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTotalReturnSwap() {
  return useQuery({
    queryKey: ['total-return-swap'],
    queryFn: () => api.get<any>('/total-return-swap'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
