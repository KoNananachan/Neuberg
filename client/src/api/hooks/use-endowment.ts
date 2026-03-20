import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEndowment() {
  return useQuery({
    queryKey: ['endowment'],
    queryFn: () => api.get<any>('/endowment'),
    staleTime: 60 * 60 * 1000,
  });
}
