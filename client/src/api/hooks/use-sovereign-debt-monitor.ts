import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDebtMonitor() {
  return useQuery({
    queryKey: ['sovereign-debt-monitor'],
    queryFn: () => api.get<any>('/sovereign-debt-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
