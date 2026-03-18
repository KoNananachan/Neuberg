import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityStressTest() {
  return useQuery({
    queryKey: ['liquidity-stress-test'],
    queryFn: () => api.get<any>('/liquidity-stress-test'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
