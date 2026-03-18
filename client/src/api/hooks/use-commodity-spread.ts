import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommoditySpread() {
  return useQuery({
    queryKey: ['commodity-spread'],
    queryFn: () => api.get<any>('/commodity-spread'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
