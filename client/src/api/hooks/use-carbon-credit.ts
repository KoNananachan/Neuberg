import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCarbonCredit() {
  return useQuery({
    queryKey: ['carbon-credit'],
    queryFn: () => api.get<any>('/carbon-credit'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
