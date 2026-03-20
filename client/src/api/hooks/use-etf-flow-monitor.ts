import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfFlowMonitor() {
  return useQuery({
    queryKey: ['etf-flow-monitor'],
    queryFn: () => api.get<any>('/etf-flow-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
