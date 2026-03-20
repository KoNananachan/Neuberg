import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSanctionsMonitor() {
  return useQuery({
    queryKey: ['sanctions-monitor'],
    queryFn: () => api.get<any>('/sanctions-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
