import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEarningsRevision() {
  return useQuery({
    queryKey: ['earnings-revision'],
    queryFn: () => api.get<any>('/earnings-revision'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
