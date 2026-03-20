import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEarningsRevision() {
  return useQuery({
    queryKey: ['earnings-revision'],
    queryFn: () => api.get<any>('/earnings-revision'),
    staleTime: 60 * 60 * 1000,
  });
}
