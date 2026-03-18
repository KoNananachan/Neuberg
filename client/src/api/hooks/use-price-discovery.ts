import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePriceDiscovery() {
  return useQuery({
    queryKey: ['price-discovery'],
    queryFn: () => api.get<any>('/price-discovery'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
