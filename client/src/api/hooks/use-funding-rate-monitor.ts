import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useFundingRateMonitor() {
  return useQuery({
    queryKey: ['funding-rate-monitor'],
    queryFn: () => api.get<any>('/funding-rate-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
