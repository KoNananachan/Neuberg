import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalCreditMonitor() {
  return useQuery({
    queryKey: ['global-credit-monitor'],
    queryFn: () => api.get<any>('/global-credit-monitor'),
    staleTime: 180000,
  });
}
