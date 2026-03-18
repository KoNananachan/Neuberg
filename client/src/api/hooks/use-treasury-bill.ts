import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryBill() {
  return useQuery({
    queryKey: ['treasury-bill'],
    queryFn: () => api.get<any>('/treasury-bill'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
