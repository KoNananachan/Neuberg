import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityMonitor() {
  return useQuery({
    queryKey: ['liquidity-monitor'],
    queryFn: () => api.get<any>('/liquidity-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
