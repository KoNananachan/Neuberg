import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useABS() {
  return useQuery({
    queryKey: ['abs'],
    queryFn: () => api.get<any>('/abs'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
