import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityDashboard() {
  return useQuery({
    queryKey: ['liquidity-dashboard'],
    queryFn: () => api.get<any>('/liquidity-dashboard'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
