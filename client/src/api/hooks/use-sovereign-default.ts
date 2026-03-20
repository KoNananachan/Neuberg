import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDefault() {
  return useQuery({
    queryKey: ['sovereign-default'],
    queryFn: () => api.get<any>('/sovereign-default'),
    staleTime: 60 * 60 * 1000,
  });
}
