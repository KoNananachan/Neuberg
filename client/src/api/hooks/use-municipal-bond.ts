import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMunicipalBond() {
  return useQuery({
    queryKey: ['municipal-bond'],
    queryFn: () => api.get<any>('/municipal-bond'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
