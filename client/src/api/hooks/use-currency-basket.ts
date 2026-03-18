import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCurrencyBasket() {
  return useQuery({
    queryKey: ['currency-basket'],
    queryFn: () => api.get<any>('/currency-basket'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
