import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useQuantFactor() {
  return useQuery({
    queryKey: ['quant-factor'],
    queryFn: () => api.get<any>('/quant-factor'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
