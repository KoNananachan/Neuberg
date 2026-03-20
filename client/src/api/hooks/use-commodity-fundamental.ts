import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityFundamental() {
  return useQuery({
    queryKey: ['commodity-fundamental'],
    queryFn: () => api.get<any>('/commodity-fundamental'),
    staleTime: 60 * 60 * 1000,
  });
}
