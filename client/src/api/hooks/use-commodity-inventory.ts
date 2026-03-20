import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityInventory() {
  return useQuery({
    queryKey: ['commodity-inventory'],
    queryFn: () => api.get<any>('/commodity-inventory'),
    staleTime: 60 * 60 * 1000,
  });
}
