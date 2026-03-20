import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEtfPremium() {
  return useQuery({
    queryKey: ['etf-premium'],
    queryFn: () => api.get<any>('/etf-premium'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
