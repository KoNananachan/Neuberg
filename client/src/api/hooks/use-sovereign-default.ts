import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDefault() {
  return useQuery({
    queryKey: ['sovereign-default'],
    queryFn: () => api.get<any>('/sovereign-default'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
