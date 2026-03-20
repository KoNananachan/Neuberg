import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useSectorCreditSpread() {
  return useQuery({
    queryKey: ['sector-credit-spread'],
    queryFn: () => api.get<any>('/sector-credit-spread'),
    staleTime: 60 * 60 * 1000,
  });
}
