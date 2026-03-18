import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOrderBook() {
  return useQuery({
    queryKey: ['order-book'],
    queryFn: () => api.get<any>('/order-book'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
