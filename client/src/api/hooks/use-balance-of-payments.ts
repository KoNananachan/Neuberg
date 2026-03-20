import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBalanceOfPayments() {
  return useQuery({
    queryKey: ['balance-of-payments'],
    queryFn: () => api.get<any>('/balance-of-payments'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
