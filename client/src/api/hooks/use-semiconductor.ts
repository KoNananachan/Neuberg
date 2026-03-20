import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSemiconductor() {
  return useQuery({
    queryKey: ['semiconductor'],
    queryFn: () => api.get<any>('/semiconductor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
