import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useOrderBook() {
  return useQuery({
    queryKey: ['order-book'],
    queryFn: () => api.get<any>('/order-book'),
    staleTime: 60 * 60 * 1000,
  });
}
