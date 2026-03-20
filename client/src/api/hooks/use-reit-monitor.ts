import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useReitMonitor() {
  return useQuery({
    queryKey: ['reit-monitor'],
    queryFn: () => api.get<any>('/reit-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
