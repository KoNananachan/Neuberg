import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAbsRmbsMonitor() {
  return useQuery({
    queryKey: ['abs-rmbs-monitor'],
    queryFn: () => api.get<any>('/abs-rmbs-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
