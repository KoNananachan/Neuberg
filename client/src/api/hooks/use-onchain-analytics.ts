import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useOnchainAnalytics() {
  return useQuery({
    queryKey: ['onchain-analytics'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/onchain-analytics'),
    staleTime: 60 * 60_000,
  });
}
