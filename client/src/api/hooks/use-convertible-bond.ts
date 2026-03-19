import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConvertibleBond() {
  return useQuery({
    queryKey: ['convertible-bond'],
    queryFn: () => api.get<any>('/convertible-bond'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
