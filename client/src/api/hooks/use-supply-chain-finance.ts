import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSupplyChainFinance() {
  return useQuery({
    queryKey: ['supply-chain-finance'],
    queryFn: () => api.get<any>('/supply-chain-finance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
