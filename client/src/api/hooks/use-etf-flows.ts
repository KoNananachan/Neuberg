import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEtfFlows() {
  return useQuery({
    queryKey: ['etf-flows'],
    queryFn: () => api.get<any>('/etf-flows'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
