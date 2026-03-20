import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useGlobalFoodPrice() {
  return useQuery({
    queryKey: ['global-food-price'],
    queryFn: () => api.get<any>('/global-food-price'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
