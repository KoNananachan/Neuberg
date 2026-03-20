import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommoditySpread() {
  return useQuery({
    queryKey: ['commodity-spread'],
    queryFn: () => api.get<any>('/commodity-spread'),
    staleTime: 60 * 60 * 1000,
  });
}
