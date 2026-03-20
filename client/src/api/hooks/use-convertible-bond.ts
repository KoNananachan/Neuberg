import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConvertibleBond() {
  return useQuery({
    queryKey: ['convertible-bond'],
    queryFn: () => api.get<any>('/convertible-bond'),
    staleTime: 60 * 60 * 1000,
  });
}
