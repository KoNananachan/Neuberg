import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useCommodityCurve() {
  return useQuery({
    queryKey: ['commodity-curve'],
    queryFn: () => api.get<any>('/commodity-curve'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
