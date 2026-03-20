import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCarbonCredit() {
  return useQuery({
    queryKey: ['carbon-credit'],
    queryFn: () => api.get<any>('/carbon-credit'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
