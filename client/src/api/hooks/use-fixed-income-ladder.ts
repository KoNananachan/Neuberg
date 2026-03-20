import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFixedIncomeLadder() {
  return useQuery({
    queryKey: ['fixed-income-ladder'],
    queryFn: () => api.get<any>('/fixed-income-ladder'),
    staleTime: 60 * 60 * 1000,
  });
}
