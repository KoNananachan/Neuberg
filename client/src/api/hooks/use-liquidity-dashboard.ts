import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityDashboard() {
  return useQuery({
    queryKey: ['liquidity-dashboard'],
    queryFn: () => api.get<any>('/liquidity-dashboard'),
    staleTime: 60 * 60 * 1000,
  });
}
