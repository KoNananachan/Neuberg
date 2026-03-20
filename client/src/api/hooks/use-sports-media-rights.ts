import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSportsMediaRights() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sports-media-rights'],
    queryFn: () => api.get<any>('/sports-media-rights'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
