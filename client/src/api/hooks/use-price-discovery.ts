import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePriceDiscovery() {
  return useQuery({
    queryKey: ['price-discovery'],
    queryFn: () => api.get<any>('/price-discovery'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
