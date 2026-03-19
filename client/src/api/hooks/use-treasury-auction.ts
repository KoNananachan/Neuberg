import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useTreasuryAuction() {
  return useQuery({
    queryKey: ['treasury-auction'],
    queryFn: () => api.get<any>('/treasury-auction'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
