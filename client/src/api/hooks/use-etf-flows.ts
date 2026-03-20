import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEtfFlows() {
  return useQuery({
    queryKey: ['etf-flows'],
    queryFn: () => api.get<any>('/etf-flows'),
    staleTime: 60 * 60 * 1000,
  });
}
