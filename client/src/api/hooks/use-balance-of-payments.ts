import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBalanceOfPayments() {
  return useQuery({
    queryKey: ['balance-of-payments'],
    queryFn: () => api.get<any>('/balance-of-payments'),
    staleTime: 60 * 60 * 1000,
  });
}
