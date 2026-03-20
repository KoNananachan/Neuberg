import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEtfFlowMonitor() {
  return useQuery({
    queryKey: ['etf-flow-monitor'],
    queryFn: () => api.get<any>('/etf-flow-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
