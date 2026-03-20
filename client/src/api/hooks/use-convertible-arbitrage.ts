import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useConvertibleArbitrage() {
  return useQuery({
    queryKey: ['convertible-arbitrage'],
    queryFn: () => api.get<any>('/convertible-arbitrage'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
