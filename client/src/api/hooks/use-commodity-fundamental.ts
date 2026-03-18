import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityFundamental() {
  return useQuery({
    queryKey: ['commodity-fundamental'],
    queryFn: () => api.get<any>('/commodity-fundamental'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
