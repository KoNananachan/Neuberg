import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useBondLadder() {
  return useQuery({
    queryKey: ['bond-ladder'],
    queryFn: () => api.get<any>('/bond-ladder'),
    staleTime: 60 * 60 * 1000,
  });
}
