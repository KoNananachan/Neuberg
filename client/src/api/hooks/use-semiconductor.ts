import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSemiconductor() {
  return useQuery({
    queryKey: ['semiconductor'],
    queryFn: () => api.get<any>('/semiconductor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
