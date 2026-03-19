import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignBondAuction() {
  return useQuery({
    queryKey: ['sovereign-bond-auction'],
    queryFn: () => api.get<any>('/sovereign-bond-auction'),
    refetchInterval: 300000,
    staleTime: 180000,
  });
}
