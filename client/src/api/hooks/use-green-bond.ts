import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGreenBond() {
  return useQuery({
    queryKey: ['green-bond'],
    queryFn: () => api.get<any>('/green-bond'),
    staleTime: 60 * 60 * 1000,
  });
}
