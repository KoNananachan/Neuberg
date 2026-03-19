import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDataCenterInfrastructure() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['data-center-infrastructure'],
    queryFn: () => api.get<any>('/data-center-infrastructure'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
