import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useInstitutionalOwnership() {
  return useQuery({
    queryKey: ['institutional-ownership'],
    queryFn: () => api.get<any>('/institutional-ownership'),
    staleTime: 60 * 60 * 1000,
  });
}
