import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTotalReturnSwap() {
  return useQuery({
    queryKey: ['total-return-swap'],
    queryFn: () => api.get<any>('/total-return-swap'),
    staleTime: 60 * 60 * 1000,
  });
}
