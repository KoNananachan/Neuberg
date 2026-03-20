import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useMarketMicrostructure() {
  return useQuery({
    queryKey: ['market-microstructure'],
    queryFn: () => api.get<any>('/market-microstructure'),
    staleTime: 60 * 60 * 1000,
  });
}
