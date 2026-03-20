import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useAgriculturalFutures() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['agricultural-futures'],
    queryFn: () => api.get<any>('/agricultural-futures'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
