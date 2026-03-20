import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCollateralMonitor() {
  return useQuery({
    queryKey: ['collateral-monitor'],
    queryFn: () => api.get<any>('/collateral-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
