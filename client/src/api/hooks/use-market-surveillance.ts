import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMarketSurveillance() {
  return useQuery({
    queryKey: ['market-surveillance'],
    queryFn: () => api.get<any>('/market-surveillance'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
