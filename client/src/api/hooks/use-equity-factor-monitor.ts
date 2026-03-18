import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEquityFactorMonitor() {
  return useQuery({
    queryKey: ['equity-factor-monitor'],
    queryFn: () => api.get<any>('/equity-factor-monitor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
