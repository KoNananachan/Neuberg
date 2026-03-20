import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSupplyChainStress() {
  return useQuery({
    queryKey: ['supply-chain-stress'],
    queryFn: () => api.get<any>('/supply-chain-stress'),
    staleTime: 60 * 60 * 1000,
  });
}
