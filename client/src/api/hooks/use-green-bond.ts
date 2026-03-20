import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGreenBond() {
  return useQuery({
    queryKey: ['green-bond'],
    queryFn: () => api.get<any>('/green-bond'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
