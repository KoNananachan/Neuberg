import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useValuationMultiples() {
  return useQuery({
    queryKey: ['valuation-multiples'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/valuation-multiples'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
