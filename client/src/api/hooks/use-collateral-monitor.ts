import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCollateralMonitor() {
  return useQuery({
    queryKey: ['collateral-monitor'],
    queryFn: () => api.get<any>('/collateral-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
