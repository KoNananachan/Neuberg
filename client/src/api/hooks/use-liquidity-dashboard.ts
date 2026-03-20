import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityDashboard() {
  return useQuery({
    queryKey: ['liquidity-dashboard'],
    queryFn: () => api.get<any>('/liquidity-dashboard'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
