import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function usePriceDiscovery() {
  return useQuery({
    queryKey: ['price-discovery'],
    queryFn: () => api.get<any>('/price-discovery'),
    staleTime: 60 * 60 * 1000,
  });
}
