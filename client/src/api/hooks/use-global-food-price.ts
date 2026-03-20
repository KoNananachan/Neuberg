import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalFoodPrice() {
  return useQuery({
    queryKey: ['global-food-price'],
    queryFn: () => api.get<any>('/global-food-price'),
    staleTime: 60 * 60 * 1000,
  });
}
