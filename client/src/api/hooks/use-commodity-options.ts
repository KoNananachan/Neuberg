import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityOptions() {
  return useQuery({
    queryKey: ['commodity-options'],
    queryFn: () => api.get<any>('/commodity-options'),
    staleTime: 60 * 60 * 1000,
  });
}
