import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSanctionsMonitor() {
  return useQuery({
    queryKey: ['sanctions-monitor'],
    queryFn: () => api.get<any>('/sanctions-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
