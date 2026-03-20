import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryBill() {
  return useQuery({
    queryKey: ['treasury-bill'],
    queryFn: () => api.get<any>('/treasury-bill'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
