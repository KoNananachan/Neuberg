import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFxCarryMonitor() {
  return useQuery({
    queryKey: ['fx-carry-monitor'],
    queryFn: () => api.get<any>('/fx-carry-monitor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
