import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useBondFuturesBasis() {
  return useQuery({
    queryKey: ['bond-futures-basis'],
    queryFn: () => api.get<any>('/bond-futures-basis'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
