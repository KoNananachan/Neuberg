import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useConvertibleBonds() {
  return useQuery({
    queryKey: ['convertible-bonds'],
    queryFn: () => api.get<any>('/convertible-bonds'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
