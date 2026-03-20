import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useSovereignDebtMonitor() {
  return useQuery({
    queryKey: ['sovereign-debt-monitor'],
    queryFn: () => api.get<any>('/sovereign-debt-monitor'),
    staleTime: 60 * 60 * 1000,
  });
}
