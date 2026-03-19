import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBalanceOfPayments() {
  return useQuery({
    queryKey: ['balance-of-payments'],
    queryFn: () => api.get<any>('/balance-of-payments'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
