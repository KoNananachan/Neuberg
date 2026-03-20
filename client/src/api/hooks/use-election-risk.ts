import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useElectionRisk() {
  return useQuery({
    queryKey: ['election-risk'],
    queryFn: () => api.get<any>('/election-risk'),
    staleTime: 60 * 60 * 1000,
  });
}
