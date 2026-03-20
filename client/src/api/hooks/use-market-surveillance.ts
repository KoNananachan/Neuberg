import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMarketSurveillance() {
  return useQuery({
    queryKey: ['market-surveillance'],
    queryFn: () => api.get<any>('/market-surveillance'),
    staleTime: 60 * 60 * 1000,
  });
}
