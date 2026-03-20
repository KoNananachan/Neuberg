import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEarningsRevision() {
  return useQuery({
    queryKey: ['earnings-revision'],
    queryFn: () => api.get<any>('/earnings-revision'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
