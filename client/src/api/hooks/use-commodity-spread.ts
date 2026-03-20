import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommoditySpread() {
  return useQuery({
    queryKey: ['commodity-spread'],
    queryFn: () => api.get<any>('/commodity-spread'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
