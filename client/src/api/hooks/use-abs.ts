import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useABS() {
  return useQuery({
    queryKey: ['abs'],
    queryFn: () => api.get<any>('/abs'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
