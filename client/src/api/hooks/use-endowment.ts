import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useEndowment() {
  return useQuery({
    queryKey: ['endowment'],
    queryFn: () => api.get<any>('/endowment'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
