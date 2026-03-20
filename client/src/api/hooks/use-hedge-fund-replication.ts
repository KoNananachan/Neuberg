import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useHedgeFundReplication() {
  return useQuery({
    queryKey: ['hedge-fund-replication'],
    queryFn: () => api.get<any>('/hedge-fund-replication'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
