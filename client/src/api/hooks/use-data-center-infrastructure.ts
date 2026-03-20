import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useDataCenterInfrastructure() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['data-center-infrastructure'],
    queryFn: () => api.get<any>('/data-center-infrastructure'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
