import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityMonitor() {
  return useQuery({
    queryKey: ['liquidity-monitor'],
    queryFn: () => api.get<any>('/liquidity-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
