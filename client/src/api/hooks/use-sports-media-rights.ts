import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSportsMediaRights() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sports-media-rights'],
    queryFn: () => api.get<any>('/sports-media-rights'),
    staleTime: 60 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
