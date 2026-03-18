import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useConvertibleArb() {
  return useQuery({
    queryKey: ['convertible-arb'],
    queryFn: () => api.get<any>('/convertible-arb'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
