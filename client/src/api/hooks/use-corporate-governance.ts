import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorporateGovernance() {
  return useQuery({
    queryKey: ['corporate-governance'],
    queryFn: () => api.get<any>('/corporate-governance'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
