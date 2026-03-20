import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useValuationMultiples() {
  return useQuery({
    queryKey: ['valuation-multiples'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn: () => api.get<any>('/valuation-multiples'),
    staleTime: 60 * 60_000,
  });
}
