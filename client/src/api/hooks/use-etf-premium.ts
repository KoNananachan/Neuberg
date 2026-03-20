import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEtfPremium() {
  return useQuery({
    queryKey: ['etf-premium'],
    queryFn: () => api.get<any>('/etf-premium'),
    staleTime: 60 * 60 * 1000,
  });
}
