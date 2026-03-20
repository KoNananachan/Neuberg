import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCollateralManagement() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['collateral-management'],
    queryFn: () => api.get<any>('/collateral-management'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
