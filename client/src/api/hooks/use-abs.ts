import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useABS() {
  return useQuery({
    queryKey: ['abs'],
    queryFn: () => api.get<any>('/abs'),
    staleTime: 60 * 60 * 1000,
  });
}
