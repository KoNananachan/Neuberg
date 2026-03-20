import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useAbsRmbsMonitor() {
  return useQuery({
    queryKey: ['abs-rmbs-monitor'],
    queryFn: () => api.get<any>('/abs-rmbs-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
