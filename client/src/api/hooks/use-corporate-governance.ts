import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorporateGovernance() {
  return useQuery({
    queryKey: ['corporate-governance'],
    queryFn: () => api.get<any>('/corporate-governance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
