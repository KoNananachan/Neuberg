import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSanctionsMonitor() {
  return useQuery({
    queryKey: ['sanctions-monitor'],
    queryFn: () => api.get<any>('/sanctions-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
