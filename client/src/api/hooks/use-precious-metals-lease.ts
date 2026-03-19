import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePreciousMetalsLease() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['precious-metals-lease'],
    queryFn: () => api.get<any>('/precious-metals-lease'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
