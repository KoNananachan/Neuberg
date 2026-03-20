import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMarketMicrostructure() {
  return useQuery({
    queryKey: ['market-microstructure'],
    queryFn: () => api.get<any>('/market-microstructure'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
