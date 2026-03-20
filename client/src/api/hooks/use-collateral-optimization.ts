import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCollateralOptimization() {
  return useQuery({
    queryKey: ['collateral-optimization'],
    queryFn: () => api.get<any>('/collateral-optimization'),
    staleTime: 60 * 60 * 1000,
  });
}
