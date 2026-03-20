import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCurrencyBasket() {
  return useQuery({
    queryKey: ['currency-basket'],
    queryFn: () => api.get<any>('/currency-basket'),
    staleTime: 60 * 60 * 1000,
  });
}
