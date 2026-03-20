import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSpecialSituations() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['special-situations'],
    queryFn: () => api.get<any>('/special-situations'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
