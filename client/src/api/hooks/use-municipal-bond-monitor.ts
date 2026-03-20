import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMunicipalBondMonitor() {
  return useQuery({
    queryKey: ['municipal-bond-monitor'],
    queryFn: () => api.get<any>('/municipal-bond-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
