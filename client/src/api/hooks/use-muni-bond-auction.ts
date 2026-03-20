import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMuniBondAuction() {
  return useQuery({
    queryKey: ['muni-bond-auction'],
    queryFn: () => api.get<any>('/muni-bond-auction'),
    staleTime: 60 * 60 * 1000,
  });
}
