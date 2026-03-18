import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCollateralManagement() {
  return useQuery({
    queryKey: ['collateral-management'],
    queryFn: () => api.get<any>('/collateral-management'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
