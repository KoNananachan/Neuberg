import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgriculturalFutures() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agricultural-futures'],
    queryFn: () => api.get<any>('/agricultural-futures'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
