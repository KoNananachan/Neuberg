import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundFlow() {
  return useQuery({
    queryKey: ['fund-flow'],
    queryFn: () => api.get<any>('/fund-flow'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
