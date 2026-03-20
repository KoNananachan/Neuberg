import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryBill() {
  return useQuery({
    queryKey: ['treasury-bill'],
    queryFn: () => api.get<any>('/treasury-bill'),
    staleTime: 60 * 60 * 1000,
  });
}
