import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useCommodityDemand() {
  return useQuery({
    queryKey: ['commodity-demand'],
    queryFn: () => api.get<any>('/commodity-demand'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
