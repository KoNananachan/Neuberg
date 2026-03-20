import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useInflationMonitor() {
  return useQuery({
    queryKey: ['inflation-monitor'],
    queryFn: () => api.get<any>('/inflation-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
