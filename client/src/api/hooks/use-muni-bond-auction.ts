import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMuniBondAuction() {
  return useQuery({
    queryKey: ['muni-bond-auction'],
    queryFn: () => api.get<any>('/muni-bond-auction'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
