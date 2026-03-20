import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBondFuturesBasis() {
  return useQuery({
    queryKey: ['bond-futures-basis'],
    queryFn: () => api.get<any>('/bond-futures-basis'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
