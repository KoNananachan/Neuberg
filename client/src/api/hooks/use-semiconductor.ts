import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSemiconductor() {
  return useQuery({
    queryKey: ['semiconductor'],
    queryFn: () => api.get<any>('/semiconductor'),
    staleTime: 60 * 60 * 1000,
  });
}
