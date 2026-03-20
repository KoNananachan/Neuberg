import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useGlobalLiquidityMonitor() {
  return useQuery({
    queryKey: ['global-liquidity-monitor'],
    queryFn: () => api.get<any>('/global-liquidity-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
