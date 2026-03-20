import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useHedgeFundReplication() {
  return useQuery({
    queryKey: ['hedge-fund-replication'],
    queryFn: () => api.get<any>('/hedge-fund-replication'),
    staleTime: 60 * 60 * 1000,
  });
}
