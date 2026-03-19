import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalFoodPrice() {
  return useQuery({
    queryKey: ['global-food-price'],
    queryFn: () => api.get<any>('/global-food-price'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
