import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useTreasuryAuctions() {
  return useQuery({
    queryKey: ['treasury-auctions'],
    queryFn: () => api.get<any>('/treasury-auctions'),
    staleTime: 60 * 60 * 1000,
  });
}
