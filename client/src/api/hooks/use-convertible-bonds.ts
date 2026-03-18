import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useConvertibleBonds() {
  return useQuery({
    queryKey: ['convertible-bonds'],
    queryFn: () => api.get<any>('/convertible-bonds'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
