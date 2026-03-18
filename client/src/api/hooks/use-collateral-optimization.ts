import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCollateralOptimization() {
  return useQuery({
    queryKey: ['collateral-optimization'],
    queryFn: () => api.get<any>('/collateral-optimization'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
