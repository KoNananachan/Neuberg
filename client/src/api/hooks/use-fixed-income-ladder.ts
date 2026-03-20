import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFixedIncomeLadder() {
  return useQuery({
    queryKey: ['fixed-income-ladder'],
    queryFn: () => api.get<any>('/fixed-income-ladder'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
