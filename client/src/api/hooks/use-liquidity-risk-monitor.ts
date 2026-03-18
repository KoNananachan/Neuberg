import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useLiquidityRiskMonitor() {
  return useQuery({
    queryKey: ['liquidity-risk-monitor'],
    queryFn: () => api.get<any>('/liquidity-risk-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
