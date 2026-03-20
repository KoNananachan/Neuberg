import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCatastropheBond() {
  return useQuery({
    queryKey: ['catastrophe-bond'],
    queryFn: () => api.get<any>('/catastrophe-bond'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
