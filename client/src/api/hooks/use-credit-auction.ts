import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCreditAuction() {
  return useQuery({
    queryKey: ['credit-auction'],
    queryFn: () => api.get<any>('/credit-auction'),
    staleTime: 60 * 60 * 1000,
  });
}
