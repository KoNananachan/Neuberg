import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLiquidityMonitor() {
  return useQuery({
    queryKey: ['liquidity-monitor'],
    queryFn: () => api.get<any>('/liquidity-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
