import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDebtMonitor() {
  return useQuery({
    queryKey: ['sovereign-debt-monitor'],
    queryFn: () => api.get<any>('/sovereign-debt-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
