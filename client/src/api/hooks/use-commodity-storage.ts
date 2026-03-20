import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityStorage() {
  return useQuery({
    queryKey: ['commodity-storage'],
    queryFn: () => api.get<any>('/commodity-storage'),
    staleTime: 60 * 60 * 1000,
  });
}
