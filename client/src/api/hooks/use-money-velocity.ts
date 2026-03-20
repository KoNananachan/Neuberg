import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMoneyVelocity() {
  return useQuery({
    queryKey: ['money-velocity'],
    queryFn: () => api.get<any>('/money-velocity'),
    staleTime: 60 * 60 * 1000,
  });
}
