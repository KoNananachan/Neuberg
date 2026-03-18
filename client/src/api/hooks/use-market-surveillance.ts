import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMarketSurveillance() {
  return useQuery({
    queryKey: ['market-surveillance'],
    queryFn: () => api.get<any>('/market-surveillance'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
