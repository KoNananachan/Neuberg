import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOrderBook() {
  return useQuery({
    queryKey: ['order-book'],
    queryFn: () => api.get<any>('/order-book'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
