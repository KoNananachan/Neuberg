import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useQuantFactor() {
  return useQuery({
    queryKey: ['quant-factor'],
    queryFn: () => api.get<any>('/quant-factor'),
    staleTime: 60 * 60 * 1000,
  });
}
