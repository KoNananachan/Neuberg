import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMunicipalBond() {
  return useQuery({
    queryKey: ['municipal-bond'],
    queryFn: () => api.get<any>('/municipal-bond'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
