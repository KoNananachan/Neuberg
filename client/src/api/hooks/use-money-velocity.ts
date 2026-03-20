import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyVelocity() {
  return useQuery({
    queryKey: ['money-velocity'],
    queryFn: () => api.get<any>('/money-velocity'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
