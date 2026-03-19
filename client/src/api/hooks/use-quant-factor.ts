import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useQuantFactor() {
  return useQuery({
    queryKey: ['quant-factor'],
    queryFn: () => api.get<any>('/quant-factor'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
