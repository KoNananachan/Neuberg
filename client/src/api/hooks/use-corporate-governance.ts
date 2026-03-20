import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCorporateGovernance() {
  return useQuery({
    queryKey: ['corporate-governance'],
    queryFn: () => api.get<any>('/corporate-governance'),
    staleTime: 60 * 60 * 1000,
  });
}
