import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGreenBond() {
  return useQuery({
    queryKey: ['green-bond'],
    queryFn: () => api.get<any>('/green-bond'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
