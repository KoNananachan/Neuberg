import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundFlow() {
  return useQuery({
    queryKey: ['fund-flow'],
    queryFn: () => api.get<any>('/fund-flow'),
    staleTime: 60 * 60 * 1000,
  });
}
