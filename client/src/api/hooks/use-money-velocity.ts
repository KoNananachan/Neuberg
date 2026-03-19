import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyVelocity() {
  return useQuery({
    queryKey: ['money-velocity'],
    queryFn: () => api.get<any>('/money-velocity'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
