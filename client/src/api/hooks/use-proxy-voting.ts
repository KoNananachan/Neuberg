import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useProxyVoting() {
  return useQuery({
    queryKey: ['proxy-voting'],
    queryFn: () => api.get<any>('/proxy-voting'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
