import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMacroRegimeMonitor() {
  return useQuery({
    queryKey: ['macro-regime-monitor'],
    queryFn: () => api.get<any>('/macro-regime-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
