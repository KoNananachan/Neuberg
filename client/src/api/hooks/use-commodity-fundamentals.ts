import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommodityFundamentals() {
  return useQuery({
    queryKey: ['commodity-fundamentals'],
    queryFn: () => api.get<any>('/commodity-fundamentals'),
    staleTime: 60 * 60 * 1000,
  });
}
