import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSupplyChainStress() {
  return useQuery({
    queryKey: ['supply-chain-stress'],
    queryFn: () => api.get<any>('/supply-chain-stress'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
