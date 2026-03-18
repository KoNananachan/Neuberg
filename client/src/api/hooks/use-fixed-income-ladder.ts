import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFixedIncomeLadder() {
  return useQuery({
    queryKey: ['fixed-income-ladder'],
    queryFn: () => api.get<any>('/fixed-income-ladder'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
